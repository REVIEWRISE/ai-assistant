import {
  splitRetellGeneralPrompt,
} from "@/lib/retell-voice-prompt";
import { isRetellCustomLlmEnabled, getRetellCustomLlmWebSocketUrl } from "@/lib/retell-custom-llm-config";
import { buildVoiceAgentPromptPayload } from "@/lib/retell-voice-llm-prompt";
import {
  createRetellAgent,
  createRetellAgentVersion,
  createRetellLlm,
  extractRetellLlmId,
  getRetellAgent,
  getRetellLlm,
  getRetellPhoneNumber,
  isRetellApiConfigured,
  isRetellCustomLlmAgent,
  listRetellVoices,
  publishRetellAgentVersion,
  readRetellAgentId,
  readRetellAgentIsPublished,
  readRetellAgentVersion,
  readRetellLlmId,
  updateRetellAgent,
  updateRetellLlm,
  updateRetellPhoneNumber,
  type RetellAgentRecord,
  type RetellLlmRecord,
  type RetellVoiceListItem,
} from "@/lib/retell-api";
import {
  RETELL_DEFAULT_LLM_MODEL,
  RETELL_VOICE_CUSTOM_VALUE,
  normalizeRetellVoiceSelection,
  pickDefaultRetellVoiceId,
  resolveRetellVoiceId,
  type RetellLanguage,
  type RetellVoiceAgentConfig,
  type VoiceAgentKnowledgeConfig,
  type VoiceAgentPhoneConfig,
} from "@/lib/retell-voice-agent";

export {
  buildRetellGeneralPromptWithKnowledge,
  RETELL_KNOWLEDGE_PROMPT_MARKER,
  splitRetellGeneralPrompt,
} from "@/lib/retell-voice-prompt";

export type RetellSyncResult = { ok: true; agentId?: string } | { ok: false; error: string };

export type RetellCreateResult =
  | { ok: true; agentId: string }
  | { ok: false; error: string };

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function readNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseRetellLanguage(v: unknown): RetellLanguage {
  const raw = readString(v);
  if (raw === "en-US" || raw === "en-GB" || raw === "en-AU" || raw === "es-ES" || raw === "fr-FR" || raw === "de-DE") {
    return raw;
  }
  if (raw.startsWith("en")) return "en-US";
  return "en-US";
}

function buildCustomLlmResponseEngine(): Record<string, unknown> | null {
  const wsUrl = getRetellCustomLlmWebSocketUrl();
  if (!wsUrl) return null;
  return { type: "custom-llm", llm_websocket_url: wsUrl };
}

function customLlmConfigError(): string {
  return "Enable custom LLM: set RETELL_USE_CUSTOM_LLM=true, configure RETELL_CUSTOM_LLM_WS_URL (or nginx + NEXT_PUBLIC_APP_URL), and run the retell-llm server.";
}

function isMissingRetellAgent(result: { status: number; error: string }): boolean {
  if (result.status === 404) return true;

  return /^item\s+agent_[^\s]+\s+not found from agent$/i.test(result.error.trim());
}

function buildRetellLlmSyncBody(args: {
  generalPrompt: string;
  openingMessage: string;
  generalTools?: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  return {
    model: RETELL_DEFAULT_LLM_MODEL,
    general_prompt: args.generalPrompt,
    begin_message: args.openingMessage.trim(),
    start_speaker: "agent",
    general_tools: args.generalTools ?? [],
  };
}

async function ensureRetellAgentDraft(agentId: string): Promise<RetellSyncResult> {
  const id = agentId.trim();
  if (!id) return { ok: false, error: "Retell agent ID is required." };

  let agentResult = await getRetellAgent(id, "latest");
  if (!agentResult.ok) {
    agentResult = await getRetellAgent(id);
  }
  if (!agentResult.ok) {
    return { ok: false, error: agentResult.error };
  }

  if (!readRetellAgentIsPublished(agentResult.data)) {
    return { ok: true };
  }

  const version = readRetellAgentVersion(agentResult.data);
  if (version == null) {
    return { ok: false, error: "Could not read Retell agent version to create a draft." };
  }

  const draft = await createRetellAgentVersion(id, { base_version: version });
  if (!draft.ok) {
    return { ok: false, error: draft.error };
  }

  return { ok: true };
}

async function publishRetellAgentDraft(agentId: string): Promise<RetellSyncResult> {
  const id = agentId.trim();
  if (!id) return { ok: false, error: "Retell agent ID is required to publish." };

  let agentResult = await getRetellAgent(id, "latest");
  if (!agentResult.ok) {
    agentResult = await getRetellAgent(id);
  }
  if (!agentResult.ok) {
    return { ok: false, error: agentResult.error };
  }

  const version = readRetellAgentVersion(agentResult.data) ?? 0;
  const publish = await publishRetellAgentVersion(id, version);
  if (!publish.ok) {
    return { ok: false, error: publish.error };
  }

  return { ok: true };
}

function mapVoiceIdFromRetell(
  voiceId: string,
  voices: RetellVoiceListItem[] = [],
): Pick<RetellVoiceAgentConfig, "voiceId" | "customVoiceId"> {
  if (!voiceId) {
    return { voiceId: pickDefaultRetellVoiceId(voices), customVoiceId: "" };
  }

  if (voices.some((voice) => voice.voiceId === voiceId)) {
    return { voiceId, customVoiceId: "" };
  }

  return normalizeRetellVoiceSelection(
    { voiceId: RETELL_VOICE_CUSTOM_VALUE, customVoiceId: voiceId },
    voices,
  );
}

export async function fetchRetellVoiceCatalog(): Promise<RetellVoiceListItem[]> {
  if (!isRetellApiConfigured()) return [];
  const result = await listRetellVoices();
  return result.ok ? result.data : [];
}

export function mapRetellRecordsToVoiceAgentConfig(args: {
  agent: RetellAgentRecord;
  llm: RetellLlmRecord | null;
  local: RetellVoiceAgentConfig;
  voices?: RetellVoiceListItem[];
}): RetellVoiceAgentConfig {
  const voiceIdRaw = readString(args.agent.voice_id);
  const voiceFields = mapVoiceIdFromRetell(voiceIdRaw, args.voices);
  const llm = args.llm;

  return {
    enabled: args.local.enabled,
    agentName: readString(args.agent.agent_name) || args.local.agentName,
    retellAgentId: readString(args.agent.agent_id) || args.local.retellAgentId,
    ...voiceFields,
    language: parseRetellLanguage(args.agent.language),
    openingMessage: llm ? readString(llm.begin_message) || args.local.openingMessage : args.local.openingMessage,
    systemPrompt: llm
      ? splitRetellGeneralPrompt(readString(llm.general_prompt)) || args.local.systemPrompt
      : args.local.systemPrompt,
    responsiveness: readNumber(args.agent.responsiveness, args.local.responsiveness),
    interruptionSensitivity: readNumber(
      args.agent.interruption_sensitivity,
      args.local.interruptionSensitivity,
    ),
  };
}

export async function fetchRetellVoiceAgentConfig(
  local: RetellVoiceAgentConfig,
): Promise<
  | { ok: true; config: RetellVoiceAgentConfig }
  | { ok: false; error: string; status: number }
> {
  if (!isRetellApiConfigured()) {
    return { ok: false, error: "RETELL_API_KEY is not set on the server.", status: 0 };
  }

  const agentId = local.retellAgentId.trim();
  if (!agentId) {
    return {
      ok: false,
      error: "Enter a Retell agent ID to load settings from Retell.",
      status: 400,
    };
  }

  const agentResult = await getRetellAgent(agentId);
  if (!agentResult.ok) {
    return {
      ok: false,
      error: agentResult.error,
      status: agentResult.status,
    };
  }

  const llmId = extractRetellLlmId(agentResult.data);
  let llm: RetellLlmRecord | null = null;
  if (llmId) {
    const llmResult = await getRetellLlm(llmId);
    if (llmResult.ok) llm = llmResult.data;
  }

  const voices = await fetchRetellVoiceCatalog();

  return {
    ok: true,
    config: mapRetellRecordsToVoiceAgentConfig({
      agent: agentResult.data,
      llm,
      local,
      voices,
    }),
  };
}

export async function fetchRetellPhoneNumber(
  phoneNumber: string,
): Promise<{ ok: true; phoneNumber: string } | { ok: false; error: string }> {
  if (!isRetellApiConfigured()) {
    return { ok: false, error: "RETELL_API_KEY is not set on the server." };
  }
  const normalized = phoneNumber.trim();
  if (!normalized) return { ok: false, error: "No phone number to verify." };

  const result = await getRetellPhoneNumber(normalized);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const fromRetell = readRetellPhoneNumberField(result.data, normalized);
  return { ok: true, phoneNumber: fromRetell };
}

function readRetellPhoneNumberField(data: Record<string, unknown>, fallback: string): string {
  for (const key of ["phone_number", "phoneNumber", "number", "nickname"] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

export async function linkVoiceAgentPhoneInRetell(args: {
  agentId: string;
  phoneNumber: string;
}): Promise<RetellSyncResult> {
  if (!isRetellApiConfigured()) {
    return { ok: false, error: "RETELL_API_KEY is not set on the server." };
  }

  const agentId = args.agentId.trim();
  const phoneNumber = args.phoneNumber.trim();
  if (!agentId) return { ok: false, error: "Retell agent ID is required to link a phone number." };
  if (!phoneNumber) return { ok: false, error: "Phone number is required." };

  const verify = await fetchRetellPhoneNumber(phoneNumber);
  if (!verify.ok) return verify;

  const update = await updateRetellPhoneNumber(phoneNumber, {
    inbound_agents: [{ agent_id: agentId, agent_version: "latest", weight: 1 }],
  });
  if (!update.ok) {
    return { ok: false, error: update.error };
  }

  return { ok: true };
}

export async function createVoiceAgentInRetell(args: {
  organizationId: string;
  retell: RetellVoiceAgentConfig;
  knowledge: VoiceAgentKnowledgeConfig;
  phone?: VoiceAgentPhoneConfig;
}): Promise<RetellCreateResult> {
  if (!isRetellApiConfigured()) {
    return { ok: false, error: "RETELL_API_KEY is not set on the server." };
  }

  const voiceId = resolveRetellVoiceId(args.retell);
  if (!voiceId) {
    return { ok: false, error: "Select a Retell voice before creating the agent." };
  }

  const useCustomLlm = isRetellCustomLlmEnabled();
  const promptResult = await buildVoiceAgentPromptPayload({
    basePrompt: args.retell.systemPrompt,
    knowledge: args.knowledge,
    organizationId: args.organizationId,
    includeRetellHttpTools: !useCustomLlm,
  });
  if (!promptResult.ok) return promptResult;

  let responseEngine: Record<string, unknown>;
  if (useCustomLlm) {
    const customEngine = buildCustomLlmResponseEngine();
    if (!customEngine) {
      return { ok: false, error: customLlmConfigError() };
    }
    responseEngine = customEngine;
  } else {
    const llmCreate = await createRetellLlm(
      buildRetellLlmSyncBody({
        generalPrompt: promptResult.generalPrompt,
        openingMessage: args.retell.openingMessage,
        generalTools: promptResult.generalTools,
      }),
    );
    if (!llmCreate.ok) {
      return { ok: false, error: llmCreate.error };
    }

    const llmId = readRetellLlmId(llmCreate.data);
    if (!llmId) {
      return { ok: false, error: "Retell did not return an LLM ID after creation." };
    }
    responseEngine = { type: "retell-llm", llm_id: llmId };
  }

  const agentCreate = await createRetellAgent({
    response_engine: responseEngine,
    agent_name: args.retell.agentName || "Support Agent",
    voice_id: voiceId,
    language: args.retell.language,
    responsiveness: args.retell.responsiveness,
    interruption_sensitivity: args.retell.interruptionSensitivity,
  });
  if (!agentCreate.ok) {
    return { ok: false, error: agentCreate.error };
  }

  const agentId = readRetellAgentId(agentCreate.data);
  if (!agentId) {
    return { ok: false, error: "Retell did not return an agent ID after creation." };
  }

  const phoneNumber = args.phone?.twilioPhoneNumber.trim();
  if (phoneNumber) {
    const link = await linkVoiceAgentPhoneInRetell({ agentId, phoneNumber });
    if (!link.ok) return link;
  }

  const publish = await publishRetellAgentDraft(agentId);
  if (!publish.ok) return publish;

  return { ok: true, agentId };
}

/** Recreates a Retell agent when switching from retell-llm to custom-llm (Retell forbids in-place engine changes). */
export async function migrateVoiceAgentToCustomLlm(args: {
  organizationId: string;
  retell: RetellVoiceAgentConfig;
  knowledge: VoiceAgentKnowledgeConfig;
  phone?: VoiceAgentPhoneConfig;
}): Promise<RetellCreateResult> {
  if (!isRetellCustomLlmEnabled()) {
    return { ok: false, error: customLlmConfigError() };
  }

  const agentId = args.retell.retellAgentId.trim();
  if (agentId) {
    const existing = await getRetellAgent(agentId);
    if (existing.ok && isRetellCustomLlmAgent(existing.data)) {
      const sync = await syncVoiceAgentToRetell(args);
      return sync.ok ? { ok: true, agentId: sync.agentId ?? agentId } : sync;
    }
  }

  const recreated = await createVoiceAgentInRetell({
    organizationId: args.organizationId,
    retell: { ...args.retell, retellAgentId: "" },
    knowledge: args.knowledge,
    phone: args.phone,
  });
  if (!recreated.ok) return recreated;

  return { ok: true, agentId: recreated.agentId };
}

export async function syncVoiceAgentToRetell(args: {
  organizationId: string;
  retell: RetellVoiceAgentConfig;
  knowledge: VoiceAgentKnowledgeConfig;
  phone?: VoiceAgentPhoneConfig;
}): Promise<RetellSyncResult> {
  if (!isRetellApiConfigured()) {
    return { ok: false, error: "RETELL_API_KEY is not set on the server." };
  }

  const agentId = args.retell.retellAgentId.trim();
  if (!agentId) {
    return { ok: false, error: "Retell agent ID is required to sync." };
  }

  const voiceId = resolveRetellVoiceId(args.retell);
  if (!voiceId) {
    return { ok: false, error: "Select a Retell voice before syncing." };
  }

  const existing = await getRetellAgent(agentId);
  if (!existing.ok) {
    if (!isMissingRetellAgent(existing)) {
      return { ok: false, error: existing.error };
    }

    const recreated = await createVoiceAgentInRetell({
      ...args,
      retell: { ...args.retell, retellAgentId: "" },
    });
    return recreated.ok
      ? { ok: true, agentId: recreated.agentId }
      : { ok: false, error: recreated.error };
  }

  const useCustomLlm = isRetellCustomLlmEnabled();
  if (useCustomLlm && !isRetellCustomLlmAgent(existing.data)) {
    const migrated = await migrateVoiceAgentToCustomLlm(args);
    return migrated.ok
      ? { ok: true, agentId: migrated.agentId }
      : { ok: false, error: migrated.error };
  }

  const draftReady = await ensureRetellAgentDraft(agentId);
  if (!draftReady.ok) return draftReady;

  const agentPatch: Record<string, unknown> = {
    agent_name: args.retell.agentName,
    voice_id: voiceId,
    language: args.retell.language,
    responsiveness: args.retell.responsiveness,
    interruption_sensitivity: args.retell.interruptionSensitivity,
  };

  if (useCustomLlm) {
    const customEngine = buildCustomLlmResponseEngine();
    if (!customEngine) {
      return { ok: false, error: customLlmConfigError() };
    }
    agentPatch.response_engine = customEngine;
  }

  const agentUpdate = await updateRetellAgent(agentId, agentPatch);
  if (!agentUpdate.ok) {
    return { ok: false, error: agentUpdate.error };
  }

  if (useCustomLlm) {
    const promptResult = await buildVoiceAgentPromptPayload({
      basePrompt: args.retell.systemPrompt,
      knowledge: args.knowledge,
      organizationId: args.organizationId,
      includeRetellHttpTools: false,
    });
    if (!promptResult.ok) return promptResult;

    const publish = await publishRetellAgentDraft(agentId);
    if (!publish.ok) return publish;

    const phoneNumber = args.phone?.twilioPhoneNumber.trim();
    if (phoneNumber) {
      const link = await linkVoiceAgentPhoneInRetell({ agentId, phoneNumber });
      if (!link.ok) return link;
    }

    return { ok: true };
  }

  let llmId = extractRetellLlmId(agentUpdate.data);
  if (!llmId) {
    const refetch = await getRetellAgent(agentId);
    if (!refetch.ok) return { ok: false, error: refetch.error };
    llmId = extractRetellLlmId(refetch.data);
  }
  if (!llmId) {
    return {
      ok: false,
      error: "This Retell agent must use a Retell LLM response engine to sync prompts and knowledge.",
    };
  }

  return syncRetellLlmPrompt(llmId, args);
}

async function syncRetellLlmPrompt(
  llmId: string,
  args: {
    organizationId: string;
    retell: RetellVoiceAgentConfig;
    knowledge: VoiceAgentKnowledgeConfig;
    phone?: VoiceAgentPhoneConfig;
  },
): Promise<RetellSyncResult> {
  const promptResult = await buildVoiceAgentPromptPayload({
    basePrompt: args.retell.systemPrompt,
    knowledge: args.knowledge,
    organizationId: args.organizationId,
  });
  if (!promptResult.ok) return promptResult;

  const llmUpdate = await updateRetellLlm(
    llmId,
    buildRetellLlmSyncBody({
      generalPrompt: promptResult.generalPrompt!,
      openingMessage: args.retell.openingMessage,
      generalTools: promptResult.generalTools,
    }),
  );
  if (!llmUpdate.ok) {
    return { ok: false, error: llmUpdate.error };
  }

  const publish = await publishRetellAgentDraft(args.retell.retellAgentId.trim());
  if (!publish.ok) return publish;

  const phoneNumber = args.phone?.twilioPhoneNumber.trim();
  if (phoneNumber) {
    const link = await linkVoiceAgentPhoneInRetell({
      agentId: args.retell.retellAgentId.trim(),
      phoneNumber,
    });
    if (!link.ok) return link;
  }

  return { ok: true };
}

export async function resolveVoiceAgentPhoneFromRetell(
  local: VoiceAgentPhoneConfig,
): Promise<VoiceAgentPhoneConfig> {
  const number = local.twilioPhoneNumber.trim();
  if (!number || !isRetellApiConfigured()) return local;

  const result = await fetchRetellPhoneNumber(number);
  if (!result.ok) return local;
  const resolved = result.phoneNumber.trim();
  return { twilioPhoneNumber: resolved || number };
}

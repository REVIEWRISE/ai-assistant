import {
  appendVoiceRetellBookingPrompt,
  buildRetellBookingTools,
  buildVoiceRetellBookingPromptSection,
} from "@/lib/voice-retell-booking";
import { loadOrgBookingContext } from "@/lib/booking-org-gate";
import {
  buildRetellGeneralPromptWithKnowledge,
  RETELL_KNOWLEDGE_PROMPT_MARKER,
  splitRetellGeneralPrompt,
} from "@/lib/retell-voice-prompt";
import {
  createRetellAgent,
  createRetellAgentVersion,
  createRetellLlm,
  extractRetellLlmId,
  getRetellAgent,
  getRetellLlm,
  getRetellPhoneNumber,
  isRetellApiConfigured,
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

export type RetellSyncResult = { ok: true } | { ok: false; error: string };

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
): Promise<{ ok: true; config: RetellVoiceAgentConfig } | { ok: false; error: string }> {
  if (!isRetellApiConfigured()) {
    return { ok: false, error: "RETELL_API_KEY is not set on the server." };
  }

  const agentId = local.retellAgentId.trim();
  if (!agentId) {
    return { ok: false, error: "Enter a Retell agent ID to load settings from Retell." };
  }

  const agentResult = await getRetellAgent(agentId);
  if (!agentResult.ok) {
    return { ok: false, error: agentResult.error };
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

  const fromRetell = readString(result.data.phone_number) || normalized;
  return { ok: true, phoneNumber: fromRetell };
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

  const promptResult = await buildLlmPayload({
    basePrompt: args.retell.systemPrompt,
    knowledge: args.knowledge,
    organizationId: args.organizationId,
  });
  if (!promptResult.ok) return promptResult;

  const llmCreate = await createRetellLlm(
    buildRetellLlmSyncBody({
      generalPrompt: promptResult.generalPrompt!,
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

  const agentCreate = await createRetellAgent({
    response_engine: { type: "retell-llm", llm_id: llmId },
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

function buildLlmPayload(args: {
  basePrompt: string;
  knowledge: VoiceAgentKnowledgeConfig;
  organizationId: string;
}): Promise<
  RetellSyncResult & { generalPrompt?: string; generalTools?: Array<Record<string, unknown>> }
> {
  return (async () => {
    let generalPrompt = args.basePrompt.trim();

    if (args.knowledge.useOrganizationKnowledgeBase || args.knowledge.enablePhoneBooking) {
      const kb = await loadOrgBookingContext(args.organizationId);
      if (args.knowledge.requireApprovedKnowledgeBase && kb.knowledgeStatus !== "approved") {
        return {
          ok: false as const,
          error: "Approve your organization knowledge base before syncing to Retell.",
        };
      }

      if (args.knowledge.useOrganizationKnowledgeBase) {
        generalPrompt = buildRetellGeneralPromptWithKnowledge(generalPrompt, kb.knowledgeCorpus);
      }
    }

    let generalTools: Array<Record<string, unknown>> = [];
    if (args.knowledge.enablePhoneBooking) {
      const bookingSection = await buildVoiceRetellBookingPromptSection(args.organizationId);
      generalPrompt = appendVoiceRetellBookingPrompt(generalPrompt, bookingSection);
      generalTools = await buildRetellBookingTools();
      if (!generalTools.length) {
        return {
          ok: false as const,
          error: "Set NEXT_PUBLIC_APP_URL to your public app URL before enabling phone booking.",
        };
      }
    }

    return { ok: true as const, generalPrompt, generalTools };
  })();
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

  const draftReady = await ensureRetellAgentDraft(agentId);
  if (!draftReady.ok) return draftReady;

  const agentUpdate = await updateRetellAgent(agentId, {
    agent_name: args.retell.agentName,
    voice_id: voiceId,
    language: args.retell.language,
    responsiveness: args.retell.responsiveness,
    interruption_sensitivity: args.retell.interruptionSensitivity,
  });
  if (!agentUpdate.ok) {
    return { ok: false, error: agentUpdate.error };
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
  const promptResult = await buildLlmPayload({
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
  return { twilioPhoneNumber: result.phoneNumber };
}

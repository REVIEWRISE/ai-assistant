const RETELL_API_BASE = "https://api.retellai.com";

export function getRetellApiKey(): string {
  return process.env.RETELL_API_KEY?.trim() || "";
}

export function isRetellApiConfigured(): boolean {
  return Boolean(getRetellApiKey());
}

type RetellApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function readApiError(body: string, status: number): string {
  try {
    const json = JSON.parse(body) as Record<string, unknown>;
    const message = json.message;
    if (typeof message === "string" && message.trim()) return message.trim();
  } catch {
    // ignore
  }
  return body.trim() || `Voice service HTTP ${status}`;
}

async function retellRequest<T>(
  method: "GET" | "PATCH" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<RetellApiResult<T>> {
  const apiKey = getRetellApiKey();
  if (!apiKey) {
    return { ok: false, status: 0, error: "Voice service is not configured on the server." };
  }

  try {
    const res = await fetch(`${RETELL_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, status: res.status, error: readApiError(text, res.status) };
    }

    if (!text.trim()) {
      return { ok: true, data: {} as T };
    }

    try {
      return { ok: true, data: JSON.parse(text) as T };
    } catch {
      return { ok: false, status: res.status, error: "Voice service returned an invalid response." };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[retell-api] ${method} ${path} failed:`, message);
    return {
      ok: false,
      status: 0,
      error: message.includes("timeout") || message.includes("Timeout")
        ? "Could not reach the voice service (network timeout). Check your connection and try again."
        : `Voice service request failed: ${message}`.slice(0, 300),
    };
  }
}

export type RetellAgentRecord = Record<string, unknown>;
export type RetellLlmRecord = Record<string, unknown>;
export type RetellPhoneNumberRecord = Record<string, unknown>;

export function extractRetellLlmId(agent: RetellAgentRecord): string | null {
  const engine = asRecord(agent.response_engine);
  if (readString(engine.type) !== "retell-llm") return null;
  const llmId = readString(engine.llm_id);
  return llmId || null;
}

export function isRetellCustomLlmAgent(agent: RetellAgentRecord): boolean {
  const engine = asRecord(agent.response_engine);
  return readString(engine.type) === "custom-llm";
}

export function extractRetellCustomLlmWebSocketUrl(agent: RetellAgentRecord): string | null {
  const engine = asRecord(agent.response_engine);
  if (readString(engine.type) !== "custom-llm") return null;
  const url = readString(engine.llm_websocket_url);
  return url || null;
}

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function getRetellAgent(
  agentId: string,
  version?: string | number,
): Promise<RetellApiResult<RetellAgentRecord>> {
  const id = agentId.trim();
  if (!id) return { ok: false, status: 400, error: "Voice agent ID is required." };
  const query =
    version != null && String(version).trim()
      ? `?version=${encodeURIComponent(String(version))}`
      : "";
  return retellRequest<RetellAgentRecord>("GET", `/get-agent/${encodeURIComponent(id)}${query}`);
}

export async function updateRetellAgent(
  agentId: string,
  body: Record<string, unknown>,
): Promise<RetellApiResult<RetellAgentRecord>> {
  const id = agentId.trim();
  if (!id) return { ok: false, status: 400, error: "Voice agent ID is required." };
  return retellRequest<RetellAgentRecord>("PATCH", `/update-agent/${encodeURIComponent(id)}`, body);
}

export async function getRetellLlm(llmId: string): Promise<RetellApiResult<RetellLlmRecord>> {
  const id = llmId.trim();
  if (!id) return { ok: false, status: 400, error: "Retell LLM ID is required." };
  return retellRequest<RetellLlmRecord>("GET", `/get-retell-llm/${encodeURIComponent(id)}`);
}

export async function updateRetellLlm(
  llmId: string,
  body: Record<string, unknown>,
): Promise<RetellApiResult<RetellLlmRecord>> {
  const id = llmId.trim();
  if (!id) return { ok: false, status: 400, error: "Retell LLM ID is required." };
  return retellRequest<RetellLlmRecord>("PATCH", `/update-retell-llm/${encodeURIComponent(id)}`, body);
}

export async function createRetellLlm(
  body: Record<string, unknown>,
): Promise<RetellApiResult<RetellLlmRecord>> {
  return retellRequest<RetellLlmRecord>("POST", "/create-retell-llm", body);
}

export async function createRetellAgent(
  body: Record<string, unknown>,
): Promise<RetellApiResult<RetellAgentRecord>> {
  return retellRequest<RetellAgentRecord>("POST", "/create-agent", body);
}

export async function createRetellAgentVersion(
  agentId: string,
  body: { base_version: number },
): Promise<RetellApiResult<RetellAgentRecord>> {
  const id = agentId.trim();
  if (!id) return { ok: false, status: 400, error: "Voice agent ID is required." };
  return retellRequest<RetellAgentRecord>(
    "POST",
    `/create-agent-version/${encodeURIComponent(id)}`,
    body,
  );
}

export async function publishRetellAgentVersion(
  agentId: string,
  version: number,
): Promise<RetellApiResult<RetellAgentRecord>> {
  const id = agentId.trim();
  if (!id) return { ok: false, status: 400, error: "Voice agent ID is required." };
  return retellRequest<RetellAgentRecord>(
    "POST",
    `/publish-agent-version/${encodeURIComponent(id)}`,
    { version },
  );
}

export function readRetellAgentVersion(agent: RetellAgentRecord): number | null {
  const raw = agent.version ?? agent.agent_version;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.floor(raw);
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) return parseInt(raw.trim(), 10);
  return null;
}

export function readRetellAgentIsPublished(agent: RetellAgentRecord): boolean {
  return agent.is_published === true;
}

export function readRetellAgentId(agent: RetellAgentRecord): string {
  return readString(agent.agent_id);
}

export function readRetellLlmId(llm: RetellLlmRecord): string {
  return readString(llm.llm_id);
}

export async function updateRetellPhoneNumber(
  phoneNumber: string,
  body: Record<string, unknown>,
): Promise<RetellApiResult<RetellPhoneNumberRecord>> {
  const normalized = phoneNumber.trim();
  if (!normalized) {
    return { ok: false, status: 400, error: "Phone number is required." };
  }
  return retellRequest<RetellPhoneNumberRecord>(
    "PATCH",
    `/update-phone-number/${encodeURIComponent(normalized)}`,
    body,
  );
}

export type RetellVoiceListItem = {
  voiceId: string;
  voiceName: string;
  provider: string;
  accent: string;
  gender: string;
  previewAudioUrl: string;
};

export async function listRetellVoices(): Promise<RetellApiResult<RetellVoiceListItem[]>> {
  const result = await retellRequest<unknown>("GET", "/list-voices");
  if (!result.ok) return result;

  if (!Array.isArray(result.data)) {
    return { ok: false, status: result.ok ? 500 : 0, error: "Voice list could not be loaded." };
  }

  const voices: RetellVoiceListItem[] = [];
  for (const item of result.data) {
    const rec = asRecord(item);
    const voiceId = readString(rec.voice_id);
    if (!voiceId) continue;
    voices.push({
      voiceId,
      voiceName: readString(rec.voice_name) || voiceId,
      provider: readString(rec.provider),
      accent: readString(rec.accent),
      gender: readString(rec.gender),
      previewAudioUrl: readString(rec.preview_audio_url),
    });
  }

  return { ok: true, data: voices };
}

export async function getRetellPhoneNumber(
  phoneNumber: string,
): Promise<RetellApiResult<RetellPhoneNumberRecord>> {
  const normalized = phoneNumber.trim();
  if (!normalized) {
    return { ok: false, status: 400, error: "Phone number is required." };
  }
  return retellRequest<RetellPhoneNumberRecord>(
    "GET",
    `/get-phone-number/${encodeURIComponent(normalized)}`,
  );
}

export type RetellPhoneListItem = {
  phoneNumber: string;
  phoneNumberPretty: string;
  nickname: string;
  phoneNumberType: string;
  inboundAgentIds: string[];
};

export function readRetellPhoneNumberField(record: RetellPhoneNumberRecord): string {
  for (const key of ["phone_number", "phoneNumber", "number"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function readRetellInboundAgentIds(record: RetellPhoneNumberRecord): string[] {
  const agents = record.inbound_agents;
  if (!Array.isArray(agents)) return [];

  const ids: string[] = [];
  for (const item of agents) {
    const rec = asRecord(item);
    const agentId = readString(rec.agent_id ?? rec.agentId);
    if (agentId) ids.push(agentId);
  }
  return ids;
}

export function mapRetellPhoneListItem(record: RetellPhoneNumberRecord): RetellPhoneListItem | null {
  const phoneNumber = readRetellPhoneNumberField(record);
  if (!phoneNumber) return null;

  return {
    phoneNumber,
    phoneNumberPretty:
      readString(record.phone_number_pretty) || readString(record.phoneNumberPretty) || phoneNumber,
    nickname: readString(record.nickname),
    phoneNumberType: readString(record.phone_number_type) || readString(record.phoneNumberType),
    inboundAgentIds: readRetellInboundAgentIds(record),
  };
}

export async function listRetellPhoneNumbers(): Promise<RetellApiResult<RetellPhoneListItem[]>> {
  const result = await retellRequest<unknown>("GET", "/list-phone-numbers");
  if (!result.ok) return result;

  if (!Array.isArray(result.data)) {
    return { ok: false, status: 500, error: "Phone list could not be loaded." };
  }

  const phones: RetellPhoneListItem[] = [];
  for (const item of result.data) {
    const mapped = mapRetellPhoneListItem(asRecord(item));
    if (mapped) phones.push(mapped);
  }

  return { ok: true, data: phones };
}

export async function createRetellPhoneNumber(
  body: Record<string, unknown>,
): Promise<RetellApiResult<RetellPhoneNumberRecord>> {
  return retellRequest<RetellPhoneNumberRecord>("POST", "/create-phone-number", body);
}

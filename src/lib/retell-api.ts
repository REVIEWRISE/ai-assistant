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
  return body.trim() || `Retell API HTTP ${status}`;
}

async function retellRequest<T>(
  method: "GET" | "PATCH" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<RetellApiResult<T>> {
  const apiKey = getRetellApiKey();
  if (!apiKey) {
    return { ok: false, status: 0, error: "RETELL_API_KEY is not set on the server." };
  }

  const res = await fetch(`${RETELL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
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
    return { ok: false, status: res.status, error: "Retell API returned invalid JSON." };
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

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function getRetellAgent(agentId: string): Promise<RetellApiResult<RetellAgentRecord>> {
  const id = agentId.trim();
  if (!id) return { ok: false, status: 400, error: "Retell agent ID is required." };
  return retellRequest<RetellAgentRecord>("GET", `/get-agent/${encodeURIComponent(id)}`);
}

export async function updateRetellAgent(
  agentId: string,
  body: Record<string, unknown>,
): Promise<RetellApiResult<RetellAgentRecord>> {
  const id = agentId.trim();
  if (!id) return { ok: false, status: 400, error: "Retell agent ID is required." };
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
    return { ok: false, status: result.ok ? 500 : 0, error: "Retell voice list was not an array." };
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

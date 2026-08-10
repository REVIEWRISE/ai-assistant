const SHARED_CUSTOM_LLM_WS_URL = "wss://agentllm.vyntrise.com/llm-websocket";

/** Explicit opt-in for Custom LLM (uses your OPENAI_API_KEY on live calls). */
export function isRetellCustomLlmEnabled(): boolean {
  const flag = process.env.RETELL_USE_CUSTOM_LLM?.trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "on") return true;
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return Boolean(process.env.RETELL_CUSTOM_LLM_WS_URL?.trim());
}

/** Public WebSocket base URL Retell connects to (no trailing slash, no call_id suffix). */
export function getRetellCustomLlmWebSocketUrl(): string {
  if (!isRetellCustomLlmEnabled()) return "";

  // Local, staging, and production agents all use the hosted LLM service.
  return SHARED_CUSTOM_LLM_WS_URL;
}

export function getRetellCustomLlmListenPort(): number {
  const raw = Number(process.env.RETELL_CUSTOM_LLM_PORT?.trim() || "3001");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3001;
}

export function getRetellCustomLlmListenHost(): string {
  return process.env.RETELL_CUSTOM_LLM_HOST?.trim() || "0.0.0.0";
}

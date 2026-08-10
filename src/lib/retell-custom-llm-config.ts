const PRODUCTION_CUSTOM_LLM_WS_URL = "wss://agentllm.vyntrise.com/llm-websocket";

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

  // Never derive a localhost URL from a stale NEXT_PUBLIC_APP_URL in production.
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_CUSTOM_LLM_WS_URL;
  }

  const explicit = process.env.RETELL_CUSTOM_LLM_WS_URL?.trim().replace(/\/$/, "");
  if (explicit && !explicit.includes("YOUR_PUBLIC_HOST")) return explicit;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!appUrl) return "";

  if (appUrl.startsWith("https://")) {
    return `wss://${appUrl.slice("https://".length)}/llm-websocket`;
  }
  if (appUrl.startsWith("http://")) {
    return `ws://${appUrl.slice("http://".length)}/llm-websocket`;
  }

  return explicit?.includes("YOUR_PUBLIC_HOST") ? "" : explicit || "";
}

export function getRetellCustomLlmListenPort(): number {
  const raw = Number(process.env.RETELL_CUSTOM_LLM_PORT?.trim() || "3001");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3001;
}

export function getRetellCustomLlmListenHost(): string {
  return process.env.RETELL_CUSTOM_LLM_HOST?.trim() || "0.0.0.0";
}

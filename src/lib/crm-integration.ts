export type CrmIntegrationEvent = "booking.created";

export type CrmIntegrationConfig = {
  enabled: boolean;
  webhookUrl: string;
  /** Optional HMAC-SHA256 secret; sent as X-VyntRise-Signature when set. */
  signingSecret: string;
  events: CrmIntegrationEvent[];
};

const DEFAULT_EVENTS: CrmIntegrationEvent[] = ["booking.created"];

export function emptyCrmIntegration(): CrmIntegrationConfig {
  return {
    enabled: false,
    webhookUrl: "",
    signingSecret: "",
    events: [...DEFAULT_EVENTS],
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function resolveCrmIntegrationConfig(raw: unknown): CrmIntegrationConfig {
  const base = emptyCrmIntegration();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

  const rec = raw as Record<string, unknown>;
  const webhookUrl = String(rec.webhookUrl ?? "").trim();
  const signingSecret = String(rec.signingSecret ?? "").trim();

  const eventsRaw = rec.events;
  const events: CrmIntegrationEvent[] = Array.isArray(eventsRaw)
    ? eventsRaw
        .map((e) => String(e).trim())
        .filter((e): e is CrmIntegrationEvent => e === "booking.created")
    : [...DEFAULT_EVENTS];

  return {
    enabled: Boolean(rec.enabled) && webhookUrl.length > 0 && isHttpUrl(webhookUrl),
    webhookUrl: isHttpUrl(webhookUrl) ? webhookUrl : "",
    signingSecret: signingSecret.slice(0, 256),
    events: events.length > 0 ? events : [...DEFAULT_EVENTS],
  };
}

/** Parse form fields without requiring a valid URL (for save drafts). */
export function parseCrmIntegrationForm(raw: {
  enabled?: unknown;
  webhookUrl?: unknown;
  signingSecret?: unknown;
}): CrmIntegrationConfig {
  const webhookUrl = String(raw.webhookUrl ?? "").trim();
  const signingSecret = String(raw.signingSecret ?? "").trim();
  const enabled = raw.enabled === true || raw.enabled === "true" || raw.enabled === "on";

  return {
    enabled: enabled && webhookUrl.length > 0,
    webhookUrl,
    signingSecret: signingSecret.slice(0, 256),
    events: [...DEFAULT_EVENTS],
  };
}

export function crmIntegrationIsDispatchReady(config: CrmIntegrationConfig): boolean {
  if (!config.enabled) return false;
  if (!config.webhookUrl) return false;
  try {
    const u = new URL(config.webhookUrl);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

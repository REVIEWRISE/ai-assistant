export type CrmIntegrationEvent = "booking.created";

export type CrmIntegrationConfig = {
  /** True when webhookUrl is a valid http(s) URL. Derived on read/save — not a separate toggle. */
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
    enabled: deriveEnabled(webhookUrl),
    webhookUrl,
    signingSecret: signingSecret.slice(0, 256),
    events: events.length > 0 ? events : [...DEFAULT_EVENTS],
  };
}

function deriveEnabled(webhookUrl: string): boolean {
  const trimmed = webhookUrl.trim();
  return trimmed.length > 0 && isHttpUrl(trimmed);
}

/** Parse CRM form: active when webhook URL is non-empty and valid. Clear URL to disable. */
export function parseCrmIntegrationForm(raw: {
  webhookUrl?: unknown;
  signingSecret?: unknown;
}): CrmIntegrationConfig {
  const webhookUrl = String(raw.webhookUrl ?? "").trim();
  const signingSecret = String(raw.signingSecret ?? "").trim();
  const enabled = deriveEnabled(webhookUrl);

  return {
    enabled,
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

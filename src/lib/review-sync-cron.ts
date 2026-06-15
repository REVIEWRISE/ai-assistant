export type ReviewSyncCronIntervalMinutes = 15 | 30 | 60 | 120 | 360 | 720 | 1440;

export type ReviewSyncCronConfig = {
  enabled: boolean;
  intervalMinutes: ReviewSyncCronIntervalMinutes;
  lastRunAt: string | null;
};

export const REVIEW_SYNC_CRON_INTERVAL_OPTIONS: Array<{
  value: ReviewSyncCronIntervalMinutes;
  label: string;
}> = [
  { value: 15, label: "Every 15 minutes" },
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Every hour" },
  { value: 120, label: "Every 2 hours" },
  { value: 360, label: "Every 6 hours" },
  { value: 720, label: "Every 12 hours" },
  { value: 1440, label: "Once per day" },
];

const ALLOWED_INTERVALS = new Set<number>(REVIEW_SYNC_CRON_INTERVAL_OPTIONS.map((o) => o.value));

export function defaultReviewSyncCronConfig(): ReviewSyncCronConfig {
  return {
    enabled: false,
    intervalMinutes: 60,
    lastRunAt: null,
  };
}

function parseIntervalMinutes(value: unknown): ReviewSyncCronIntervalMinutes {
  const n = typeof value === "number" ? value : Number(value);
  if (ALLOWED_INTERVALS.has(n)) return n as ReviewSyncCronIntervalMinutes;
  return 60;
}

function parseEnabledFlag(value: unknown): boolean {
  return value === true || value === "1" || value === "true" || value === "on";
}

export function resolveReviewSyncCronConfig(raw: unknown): ReviewSyncCronConfig {
  const defaults = defaultReviewSyncCronConfig();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;

  const rec = raw as Record<string, unknown>;
  const lastRunRaw = rec.lastRunAt;
  const lastRunAt =
    typeof lastRunRaw === "string" && lastRunRaw.trim() ? lastRunRaw.trim() : null;

  return {
    enabled: parseEnabledFlag(rec.enabled),
    intervalMinutes: parseIntervalMinutes(rec.intervalMinutes),
    lastRunAt,
  };
}

export function parseReviewSyncCronForm(raw: Record<string, unknown>): ReviewSyncCronConfig {
  const existingLastRun =
    typeof raw.sync_cron_last_run_at === "string" && raw.sync_cron_last_run_at.trim()
      ? raw.sync_cron_last_run_at.trim()
      : null;

  return {
    enabled: parseEnabledFlag(raw.sync_cron_enabled),
    intervalMinutes: parseIntervalMinutes(raw.sync_cron_interval_minutes),
    lastRunAt: existingLastRun,
  };
}

export function shouldRunReviewSyncCron(
  config: ReviewSyncCronConfig,
  nowMs = Date.now(),
): boolean {
  if (!config.enabled) return false;
  if (!config.lastRunAt) return true;
  const lastMs = Date.parse(config.lastRunAt);
  if (!Number.isFinite(lastMs)) return true;
  return nowMs - lastMs >= config.intervalMinutes * 60_000;
}

export function formatReviewSyncCronSummary(config: ReviewSyncCronConfig): string {
  if (!config.enabled) return "Automatic sync is off — use Sync now on Integrations.";

  const interval =
    REVIEW_SYNC_CRON_INTERVAL_OPTIONS.find((o) => o.value === config.intervalMinutes)?.label ??
    `Every ${config.intervalMinutes} minutes`;

  if (!config.lastRunAt) {
    return `${interval} · runs automatically on the server`;
  }

  const lastMs = Date.parse(config.lastRunAt);
  if (!Number.isFinite(lastMs)) {
    return `${interval} · runs automatically on the server`;
  }

  const minutesAgo = Math.max(0, Math.round((Date.now() - lastMs) / 60_000));
  const lastLabel =
    minutesAgo < 1
      ? "just now"
      : minutesAgo < 60
        ? `${minutesAgo}m ago`
        : minutesAgo < 1440
          ? `${Math.round(minutesAgo / 60)}h ago`
          : `${Math.round(minutesAgo / 1440)}d ago`;

  return `${interval} · last run ${lastLabel}`;
}

export function reviewSyncCronEndpointPath(): string {
  return "/api/cron/reviews/sync";
}

/** How often the in-process scheduler checks for due org syncs. */
export const REVIEW_SYNC_SCHEDULER_TICK_MS = 60_000;

export function shouldStartReviewSyncScheduler(): boolean {
  const flag = process.env.REVIEW_SYNC_SCHEDULER?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  if (flag === "true" || flag === "1" || flag === "on") return true;
  return process.env.NODE_ENV === "production";
}

export function isReviewSyncCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

export function verifyReviewSyncCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return true;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";
  return bearer === expected || headerSecret === expected;
}

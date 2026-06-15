export type ReviewReplyAutomationConfig = {
  /** When true, draft AI replies for new pending reviews after each sync. */
  draftOnSync: boolean;
};

export function defaultReviewReplyAutomationConfig(): ReviewReplyAutomationConfig {
  return { draftOnSync: true };
}

function parseEnabledFlag(value: unknown): boolean {
  if (value === false || value === "0" || value === "false" || value === "off") return false;
  if (value === true || value === "1" || value === "true" || value === "on") return true;
  return true;
}

export function resolveReviewReplyAutomationConfig(raw: unknown): ReviewReplyAutomationConfig {
  const defaults = defaultReviewReplyAutomationConfig();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const rec = raw as Record<string, unknown>;
  if (rec.draftOnSync === undefined && rec.draft_on_sync === undefined) return defaults;
  return {
    draftOnSync: parseEnabledFlag(rec.draftOnSync ?? rec.draft_on_sync),
  };
}

export function parseReviewReplyAutomationForm(raw: Record<string, unknown>): ReviewReplyAutomationConfig {
  if (!("auto_draft_replies" in raw)) return defaultReviewReplyAutomationConfig();
  return {
    draftOnSync: parseEnabledFlag(raw.auto_draft_replies),
  };
}

"use client";

import { useEffect, useState } from "react";
import { SettingsCardHeader, SettingsRow, SettingsSaveBar, SettingsSwitch } from "@/components/settings-controls";
import {
  REVIEW_SYNC_CRON_INTERVAL_OPTIONS,
  defaultReviewSyncCronConfig,
  formatReviewSyncCronSummary,
  type ReviewSyncCronConfig,
} from "@/lib/review-sync-cron";
import {
  defaultReviewReplyAutomationConfig,
  type ReviewReplyAutomationConfig,
} from "@/lib/review-reply-automation";

/** Short labels for the interval pills ("Every 15 minutes" → "15 min"). */
const INTERVAL_SHORT_LABELS: Record<number, string> = {
  15: "15 min",
  30: "30 min",
  60: "1 hour",
  120: "2 hours",
  360: "6 hours",
  720: "12 hours",
  1440: "Daily",
};

export function ReviewSyncCronSettings({
  organizationId,
  initialConfig,
  initialReplyAutomation,
  readOnly = false,
  onSave,
}: {
  organizationId: string;
  initialConfig: ReviewSyncCronConfig;
  initialReplyAutomation: ReviewReplyAutomationConfig;
  readOnly?: boolean;
  onSave: (formData: FormData) => void | Promise<void>;
}) {
  const [config, setConfig] = useState<ReviewSyncCronConfig>(initialConfig);
  const [replyAutomation, setReplyAutomation] = useState<ReviewReplyAutomationConfig>(initialReplyAutomation);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  useEffect(() => {
    setReplyAutomation(initialReplyAutomation);
  }, [initialReplyAutomation]);

  const dirty =
    config.enabled !== initialConfig.enabled ||
    config.intervalMinutes !== initialConfig.intervalMinutes ||
    replyAutomation.draftOnSync !== initialReplyAutomation.draftOnSync;

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <SettingsCardHeader
        step="1"
        title="Collect & draft"
        description="How new reviews come in, and whether the assistant writes a reply for each one."
      />
      <form action={onSave}>
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="sync_cron_enabled" value={config.enabled ? "1" : "0"} />
        <input type="hidden" name="sync_cron_interval_minutes" value={String(config.intervalMinutes)} />
        <input type="hidden" name="auto_draft_replies" value={replyAutomation.draftOnSync ? "1" : "0"} />
        {config.lastRunAt ? <input type="hidden" name="sync_cron_last_run_at" value={config.lastRunAt} /> : null}

        <div className="divide-y divide-[var(--color-border)]">
          <SettingsRow
            title="Scheduled sync"
            description={formatReviewSyncCronSummary(config)}
            control={
              <SettingsSwitch
                checked={config.enabled}
                onChange={(enabled) => setConfig((prev) => ({ ...prev, enabled }))}
                label="Scheduled review sync"
                disabled={readOnly}
              />
            }
          >
            {config.enabled ? (
              <div role="radiogroup" aria-label="Sync interval" className="flex flex-wrap gap-1.5">
                {REVIEW_SYNC_CRON_INTERVAL_OPTIONS.map((option) => {
                  const selected = option.value === config.intervalMinutes;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      title={option.label}
                      disabled={readOnly}
                      onClick={() => setConfig((prev) => ({ ...prev, intervalMinutes: option.value }))}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed ${
                        selected
                          ? "border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
                          : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      {INTERVAL_SHORT_LABELS[option.value] ?? option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </SettingsRow>

          <SettingsRow
            title="AI draft replies"
            description="Write a suggested reply for every new review. What happens to the draft depends on the rating rules."
            control={
              <SettingsSwitch
                checked={replyAutomation.draftOnSync}
                onChange={(draftOnSync) => setReplyAutomation((prev) => ({ ...prev, draftOnSync }))}
                label="AI draft replies on sync"
                disabled={readOnly}
              />
            }
          />
        </div>

        <SettingsSaveBar
          dirty={dirty}
          readOnly={readOnly}
          saveLabel="Save"
          onReset={() => {
            setConfig({ ...defaultReviewSyncCronConfig(), lastRunAt: config.lastRunAt });
            setReplyAutomation(defaultReviewReplyAutomationConfig());
          }}
        />
      </form>
    </section>
  );
}

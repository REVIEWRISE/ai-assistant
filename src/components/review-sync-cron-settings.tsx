"use client";

import { useEffect, useState } from "react";
import { CustomSelect } from "@/components/custom-select";
import { Panel } from "@/components/ui";
import {
  REVIEW_SYNC_CRON_INTERVAL_OPTIONS,
  defaultReviewSyncCronConfig,
  formatReviewSyncCronSummary,
  type ReviewSyncCronConfig,
  type ReviewSyncCronIntervalMinutes,
} from "@/lib/review-sync-cron";
import {
  defaultReviewReplyAutomationConfig,
  type ReviewReplyAutomationConfig,
} from "@/lib/review-reply-automation";

export function ReviewSyncCronSettings({
  organizationId,
  initialConfig,
  initialReplyAutomation,
  onSave,
}: {
  organizationId: string;
  initialConfig: ReviewSyncCronConfig;
  initialReplyAutomation: ReviewReplyAutomationConfig;
  onSave: (formData: FormData) => void | Promise<void>;
}) {
  const [config, setConfig] = useState<ReviewSyncCronConfig>(initialConfig);
  const [replyAutomation, setReplyAutomation] = useState<ReviewReplyAutomationConfig>(
    initialReplyAutomation,
  );

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  useEffect(() => {
    setReplyAutomation(initialReplyAutomation);
  }, [initialReplyAutomation]);

  return (
    <Panel
      title="Automatic review sync"
      subtitle="Pull new reviews on a schedule instead of clicking Sync now every time"
    >
      <form action={onSave} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="sync_cron_enabled" value={config.enabled ? "1" : "0"} />
        <input type="hidden" name="sync_cron_interval_minutes" value={String(config.intervalMinutes)} />
        <input type="hidden" name="auto_draft_replies" value={replyAutomation.draftOnSync ? "1" : "0"} />
        {config.lastRunAt ? (
          <input type="hidden" name="sync_cron_last_run_at" value={config.lastRunAt} />
        ) : null}

        <p className="text-sm text-[var(--color-text-muted)]">
          When enabled, new reviews are pulled automatically on your chosen interval while the app
          is running in production. You can still use Sync now on Integrations anytime.
        </p>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Enable scheduled sync</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {formatReviewSyncCronSummary(config)}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            aria-label={config.enabled ? "Turn off scheduled sync" : "Turn on scheduled sync"}
            onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              config.enabled ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                config.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-text)]">Sync interval</p>
          <CustomSelect
            value={String(config.intervalMinutes)}
            onChange={(value) =>
              setConfig((prev) => ({
                ...prev,
                intervalMinutes: Number(value) as ReviewSyncCronIntervalMinutes,
              }))
            }
            options={REVIEW_SYNC_CRON_INTERVAL_OPTIONS.map((option) => ({
              value: String(option.value),
              label: option.label,
            }))}
            disabled={!config.enabled}
            aria-label="Review sync interval"
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Generate AI draft replies</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Draft a suggested response when new reviews sync. Stars set to &quot;Safe to
              auto-publish&quot; in routing rules are posted to Google after drafting; other buckets
              stay in the inbox for a human.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={replyAutomation.draftOnSync}
            aria-label={
              replyAutomation.draftOnSync
                ? "Turn off AI draft replies on sync"
                : "Turn on AI draft replies on sync"
            }
            onClick={() =>
              setReplyAutomation((prev) => ({ ...prev, draftOnSync: !prev.draftOnSync }))
            }
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              replyAutomation.draftOnSync ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                replyAutomation.draftOnSync ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-muted)] pt-4">
          <button
            type="button"
            onClick={() => {
              setConfig(defaultReviewSyncCronConfig());
              setReplyAutomation(defaultReviewReplyAutomationConfig());
            }}
            className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
          >
            Reset to defaults
          </button>
          <button
            type="submit"
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
          >
            Save sync schedule
          </button>
        </div>
      </form>
    </Panel>
  );
}

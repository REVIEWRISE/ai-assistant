ALTER TABLE organization_review_settings
  ADD COLUMN IF NOT EXISTS sync_cron JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organization_review_settings.sync_cron IS
  'Per-org automatic review sync: enabled, intervalMinutes, lastRunAt (ISO).';

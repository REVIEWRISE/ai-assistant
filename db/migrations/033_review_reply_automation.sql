ALTER TABLE organization_review_settings
  ADD COLUMN IF NOT EXISTS reply_automation JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organization_review_settings.reply_automation IS
  'AI reply automation: draftOnSync generates suggested responses after review sync.';

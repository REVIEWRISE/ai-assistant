ALTER TABLE organization_chatbot_settings
  ADD COLUMN IF NOT EXISTS crm_integration JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organization_chatbot_settings.crm_integration IS
  'Per-org outbound CRM webhook: enabled, webhookUrl, signingSecret, events.';

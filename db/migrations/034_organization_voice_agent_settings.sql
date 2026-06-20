CREATE TABLE IF NOT EXISTS organization_voice_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  retell_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  phone_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  knowledge_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE organization_voice_agent_settings IS
  'Per-org Retell AI phone support agent: voice, calling, and knowledge settings.';

COMMENT ON COLUMN organization_voice_agent_settings.retell_config IS
  'Retell agent identity, voice, language, and prompt settings.';

COMMENT ON COLUMN organization_voice_agent_settings.phone_config IS
  'Twilio / inbound phone number and caller-facing instructions.';

COMMENT ON COLUMN organization_voice_agent_settings.knowledge_config IS
  'How the phone agent uses the organization knowledge base.';

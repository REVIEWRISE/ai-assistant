CREATE TABLE organization_chatbot_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  welcome_message TEXT NOT NULL DEFAULT '',
  cta_label TEXT NOT NULL DEFAULT 'Continue to secure booking',
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX organization_chatbot_settings_organization_id_idx
  ON organization_chatbot_settings(organization_id);

-- Backfill from legacy knowledge-base JSON (parsed_data.chatbotConfig) when present.
INSERT INTO organization_chatbot_settings (organization_id, welcome_message, cta_label, services, created_at, updated_at)
SELECT
  kb.organization_id,
  COALESCE(kb.parsed_data->'chatbotConfig'->>'welcomeMessage', ''),
  COALESCE(
    NULLIF(TRIM(kb.parsed_data->'chatbotConfig'->>'ctaLabel'), ''),
    'Continue to secure booking'
  ),
  COALESCE(
    kb.parsed_data->'chatbotConfig'->'services',
    '[]'::jsonb
  ),
  NOW(),
  NOW()
FROM organization_knowledge_bases kb
WHERE kb.parsed_data ? 'chatbotConfig'
ON CONFLICT (organization_id) DO NOTHING;

ALTER TABLE organization_chatbot_settings
  ADD COLUMN IF NOT EXISTS icon_color text NOT NULL DEFAULT '#0f172a';

COMMENT ON COLUMN organization_chatbot_settings.icon_color IS 'Stroke/color for the chatbot icon (e.g. floating button and header bubble).';

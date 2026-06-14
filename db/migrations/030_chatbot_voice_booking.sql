ALTER TABLE organization_chatbot_settings
  ADD COLUMN IF NOT EXISTS voice_booking JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organization_chatbot_settings.voice_booking IS
  'Per-org voice booking: agent name, brand tone, and TTS voice profile preset.';

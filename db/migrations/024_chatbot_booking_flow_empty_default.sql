-- New chatbot settings rows should start with an empty booking flow (user generates each section).
ALTER TABLE organization_chatbot_settings
  ALTER COLUMN booking_flow SET DEFAULT '{}'::jsonb;

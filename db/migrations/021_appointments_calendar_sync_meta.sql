ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS external_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_sync_error TEXT;

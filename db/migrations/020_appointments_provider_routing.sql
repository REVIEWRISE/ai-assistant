ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS routed_provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS routed_connection_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_sync_status TEXT NOT NULL DEFAULT 'pending';

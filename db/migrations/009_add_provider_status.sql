ALTER TABLE providers
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'enabled';

CREATE INDEX IF NOT EXISTS idx_providers_status ON providers (status);

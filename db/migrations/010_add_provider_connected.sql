ALTER TABLE providers
ADD COLUMN IF NOT EXISTS connected BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_providers_connected ON providers (connected);

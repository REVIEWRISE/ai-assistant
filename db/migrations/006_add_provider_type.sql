ALTER TABLE providers
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'review';

CREATE INDEX IF NOT EXISTS idx_providers_type ON providers (type);

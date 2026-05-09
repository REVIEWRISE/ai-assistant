ALTER TABLE providers
ADD COLUMN IF NOT EXISTS api_url TEXT;

CREATE INDEX IF NOT EXISTS idx_providers_api_url ON providers (api_url);

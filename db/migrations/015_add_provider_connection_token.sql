ALTER TABLE provider_connections
ADD COLUMN IF NOT EXISTS token_data JSONB NOT NULL DEFAULT '{}'::jsonb;

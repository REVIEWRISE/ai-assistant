CREATE TABLE IF NOT EXISTS retell_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id VARCHAR(255) NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  call_status VARCHAR(50) NOT NULL,
  direction VARCHAR(50) NOT NULL,
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  duration_seconds INT NOT NULL,
  cost DECIMAL(10, 4) NOT NULL,
  recording_url TEXT,
  summary TEXT,
  sentiment VARCHAR(50),
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retell_calls_org ON retell_calls(organization_id);

CREATE TABLE IF NOT EXISTS retell_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_number_pretty TEXT,
  nickname TEXT,
  retell_agent_id TEXT,
  phone_number_type TEXT,
  area_code INTEGER,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, phone_number)
);

CREATE INDEX IF NOT EXISTS retell_phone_numbers_org_idx ON retell_phone_numbers (organization_id);
CREATE INDEX IF NOT EXISTS retell_phone_numbers_agent_idx ON retell_phone_numbers (retell_agent_id);

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS retell_call_id TEXT;

CREATE INDEX IF NOT EXISTS appointments_retell_call_id_idx ON appointments (retell_call_id)
  WHERE retell_call_id IS NOT NULL;

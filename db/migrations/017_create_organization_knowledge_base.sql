CREATE TABLE organization_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'text',
  source_url TEXT NULL,
  source_file_name TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  raw_text TEXT NOT NULL DEFAULT '',
  parsed_data JSONB NULL,
  last_imported_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sessions
ADD COLUMN active_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX sessions_active_organization_id_idx
ON sessions(active_organization_id);

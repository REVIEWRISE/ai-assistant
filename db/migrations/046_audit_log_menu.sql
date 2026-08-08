-- Indexes for admin audit log browsing.
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx
  ON audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_org_created_at_idx
  ON audit_events (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_action_idx
  ON audit_events (action);

-- Audit Log under Platform Settings (Admin-only).
INSERT INTO menu_items (id, label, path, sort_order, parent_id, created_at)
VALUES (
  'f1a2b3c4-d5e6-4789-a012-3456789abcdf',
  'Audit Log',
  '/platform/audit',
  1,
  '18d185ec-9cb2-46d9-bd27-e65d1341b66c',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  label = EXCLUDED.label,
  path = EXCLUDED.path,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id;

INSERT INTO menu_access (id, role_id, menu_item_id, created_at)
SELECT gen_random_uuid(), r.id, 'f1a2b3c4-d5e6-4789-a012-3456789abcdf', NOW()
FROM roles r
WHERE r.name = 'Admin'
  AND NOT EXISTS (
    SELECT 1
    FROM menu_access ma
    WHERE ma.role_id = r.id
      AND ma.menu_item_id = 'f1a2b3c4-d5e6-4789-a012-3456789abcdf'
  );

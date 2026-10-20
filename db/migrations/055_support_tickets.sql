BEGIN;

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT NULL,
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_tickets_status_check
    CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS support_tickets_organization_id_idx
  ON support_tickets (organization_id);

CREATE INDEX IF NOT EXISTS support_tickets_created_by_user_id_idx
  ON support_tickets (created_by_user_id);

CREATE INDEX IF NOT EXISTS support_tickets_status_updated_at_idx
  ON support_tickets (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_ticket_messages_author_role_check
    CHECK (author_role IN ('user', 'admin'))
);

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_id_created_at_idx
  ON support_ticket_messages (ticket_id, created_at ASC);

-- User-facing Support menu
INSERT INTO menu_items (id, label, path, sort_order, parent_id, created_at)
VALUES (
  'a7c8d9e0-f1a2-4b3c-9d4e-5f6a7b8c9d0e',
  'Support',
  '/support',
  9,
  NULL,
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    path = EXCLUDED.path,
    sort_order = EXCLUDED.sort_order,
    parent_id = EXCLUDED.parent_id;

UPDATE menu_items
SET sort_order = 10
WHERE path = '/profile' AND sort_order < 10;

-- Admin Support inbox under Platform Settings
INSERT INTO menu_items (id, label, path, sort_order, parent_id, created_at)
VALUES (
  'b8d9e0f1-a2b3-4c4d-8e5f-6a7b8c9d0e1f',
  'Support',
  '/platform/support',
  2,
  '18d185ec-9cb2-46d9-bd27-e65d1341b66c',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    path = EXCLUDED.path,
    sort_order = EXCLUDED.sort_order,
    parent_id = EXCLUDED.parent_id;

-- Grant /support to User + Admin; /platform/support to Admin only
INSERT INTO menu_access (id, role_id, menu_item_id, created_at)
SELECT gen_random_uuid(), r.id, 'a7c8d9e0-f1a2-4b3c-9d4e-5f6a7b8c9d0e', NOW()
FROM roles r
WHERE r.name IN ('User', 'Admin')
  AND NOT EXISTS (
    SELECT 1
    FROM menu_access ma
    WHERE ma.role_id = r.id
      AND ma.menu_item_id = 'a7c8d9e0-f1a2-4b3c-9d4e-5f6a7b8c9d0e'
  );

INSERT INTO menu_access (id, role_id, menu_item_id, created_at)
SELECT gen_random_uuid(), r.id, 'b8d9e0f1-a2b3-4c4d-8e5f-6a7b8c9d0e1f', NOW()
FROM roles r
WHERE r.name = 'Admin'
  AND NOT EXISTS (
    SELECT 1
    FROM menu_access ma
    WHERE ma.role_id = r.id
      AND ma.menu_item_id = 'b8d9e0f1-a2b3-4c4d-8e5f-6a7b8c9d0e1f'
  );

COMMIT;

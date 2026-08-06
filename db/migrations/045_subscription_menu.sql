-- Add Subscription menu for workspace plan tracking / cancel.
INSERT INTO menu_items (id, label, path, sort_order, parent_id, created_at)
VALUES (
  'a1b2c3d4-e5f6-4789-a012-3456789abcde',
  'Subscription',
  '/subscription',
  5,
  NULL,
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  label = EXCLUDED.label,
  path = EXCLUDED.path,
  sort_order = EXCLUDED.sort_order;

-- Grant to Admin + User roles when those roles exist.
INSERT INTO menu_access (id, role_id, menu_item_id, created_at)
SELECT gen_random_uuid(), r.id, 'a1b2c3d4-e5f6-4789-a012-3456789abcde', NOW()
FROM roles r
WHERE r.name IN ('Admin', 'User')
  AND NOT EXISTS (
    SELECT 1
    FROM menu_access ma
    WHERE ma.role_id = r.id
      AND ma.menu_item_id = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'
  );

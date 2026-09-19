-- Subscription is a workspace-owner menu. Platform admins use Billing instead.
DELETE FROM menu_access
WHERE menu_item_id = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'
  AND role_id IN (SELECT id FROM roles WHERE name = 'Admin');

INSERT INTO menu_access (id, role_id, menu_item_id, created_at)
SELECT gen_random_uuid(), r.id, 'a1b2c3d4-e5f6-4789-a012-3456789abcde', NOW()
FROM roles r
WHERE r.name = 'User'
  AND EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.id = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM menu_access ma
    WHERE ma.role_id = r.id
      AND ma.menu_item_id = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'
  );

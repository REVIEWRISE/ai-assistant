BEGIN;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES menu_items(id) ON DELETE CASCADE;

ALTER TABLE menu_items
  DROP CONSTRAINT IF EXISTS menu_items_menu_id_fkey;

ALTER TABLE menu_items
  DROP COLUMN IF EXISTS menu_id;

ALTER TABLE menu_items
  DROP COLUMN IF EXISTS menu_group;

ALTER TABLE menu_items
  DROP COLUMN IF EXISTS menu_name;

ALTER TABLE menu_items
  DROP COLUMN IF EXISTS menu_description;

DROP TABLE IF EXISTS menus;

CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON menu_items (sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_parent ON menu_items (parent_id);

COMMIT;

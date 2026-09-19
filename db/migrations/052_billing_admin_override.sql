BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS billing_admin_override BOOLEAN NOT NULL DEFAULT false;

COMMIT;

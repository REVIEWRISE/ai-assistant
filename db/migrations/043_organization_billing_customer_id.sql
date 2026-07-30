ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS billing_customer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_billing_customer_id_uidx
  ON organizations (billing_customer_id)
  WHERE billing_customer_id IS NOT NULL;

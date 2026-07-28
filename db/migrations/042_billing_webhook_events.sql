-- Idempotent delivery log for Vyntrise Billing platform webhooks.
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  organization_id UUID NULL,
  product_id TEXT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS billing_webhook_events_org_idx
  ON billing_webhook_events (organization_id);

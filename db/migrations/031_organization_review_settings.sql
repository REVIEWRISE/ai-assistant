CREATE TABLE IF NOT EXISTS organization_review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  routing_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE organization_review_settings IS
  'Per-organization review response workflow settings (rating routing, future auto-reply rules).';

COMMENT ON COLUMN organization_review_settings.routing_rules IS
  'Star-rating workflow buckets: auto_publish, needs_review, manual_approval per 1–5★.';

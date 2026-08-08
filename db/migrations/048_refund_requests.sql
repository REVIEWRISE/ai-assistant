BEGIN;

CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NULL,
  currency TEXT NULL,
  admin_note TEXT NULL,
  reviewed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT refund_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS refund_requests_organization_id_idx
  ON refund_requests (organization_id);

CREATE INDEX IF NOT EXISTS refund_requests_status_created_at_idx
  ON refund_requests (status, created_at DESC);

-- At most one pending refund request per organization.
CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_one_pending_per_org_idx
  ON refund_requests (organization_id)
  WHERE status = 'pending';

COMMIT;

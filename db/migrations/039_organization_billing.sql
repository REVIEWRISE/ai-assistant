ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan_slug TEXT,
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'needs_plan',
  ADD COLUMN IF NOT EXISTS billing_interval TEXT,
  ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_ends_at TIMESTAMPTZ;

-- Existing workspaces: keep plan starter; trial window is organization.created_at + 14 days.
UPDATE organizations
SET
  plan_slug = COALESCE(plan_slug, 'starter'),
  trial_starts_at = created_at,
  trial_ends_at = created_at + INTERVAL '14 days',
  billing_status = CASE
    WHEN paid_at IS NOT NULL THEN 'active'
    WHEN created_at + INTERVAL '14 days' <= NOW() THEN 'expired'
    ELSE 'trialing'
  END
WHERE plan_slug IS NULL
   OR billing_status = 'needs_plan'
   OR trial_starts_at IS DISTINCT FROM created_at;

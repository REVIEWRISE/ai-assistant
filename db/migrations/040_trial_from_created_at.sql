-- Align trial window with organization.created_at (source of truth for trial expiry).
UPDATE organizations
SET
  trial_starts_at = created_at,
  trial_ends_at = created_at + INTERVAL '14 days',
  billing_status = CASE
    WHEN paid_at IS NOT NULL THEN 'active'
    WHEN plan_slug IS NULL THEN 'needs_plan'
    WHEN created_at + INTERVAL '14 days' <= NOW() THEN 'expired'
    ELSE 'trialing'
  END;

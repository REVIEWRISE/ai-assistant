-- Realign trial windows to the earliest active org-owner account created_at.
UPDATE organizations o
SET
  trial_starts_at = anchor.trial_start,
  trial_ends_at = anchor.trial_start + INTERVAL '14 days',
  billing_status = CASE
    WHEN o.paid_at IS NOT NULL THEN 'active'
    WHEN o.plan_slug IS NULL THEN 'needs_plan'
    WHEN anchor.trial_start + INTERVAL '14 days' <= NOW() THEN 'expired'
    ELSE 'trialing'
  END
FROM (
  SELECT
    om.organization_id,
    MIN(u.created_at) AS trial_start
  FROM organization_members om
  JOIN users u ON u.id = om.user_id
  WHERE om.role = 'owner'
    AND u.account_status = 'active'
  GROUP BY om.organization_id
) AS anchor
WHERE o.id = anchor.organization_id;

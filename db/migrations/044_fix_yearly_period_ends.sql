-- Fix yearly subscriptions that were stored with the old +30-day period end fallback.
UPDATE organizations
SET current_period_ends_at = paid_at + INTERVAL '1 year'
WHERE billing_interval = 'yearly'
  AND billing_status = 'active'
  AND paid_at IS NOT NULL
  AND (
    current_period_ends_at IS NULL
    OR current_period_ends_at < paid_at + INTERVAL '180 days'
  );

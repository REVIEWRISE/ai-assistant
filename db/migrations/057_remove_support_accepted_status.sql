BEGIN;

-- Existing "accepted" tickets become pending (no separate accept step).
UPDATE support_tickets
SET status = 'pending',
    status_changed_at = NOW(),
    updated_at = NOW()
WHERE status = 'accepted';

ALTER TABLE support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_status_check;

ALTER TABLE support_tickets
  ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected'));

COMMIT;

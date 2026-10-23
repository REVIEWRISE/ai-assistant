BEGIN;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS requester_last_read_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS admin_last_read_at TIMESTAMPTZ NULL;

-- Existing tickets: mark requester as having read their own opening message.
UPDATE support_tickets
SET requester_last_read_at = COALESCE(requester_last_read_at, created_at)
WHERE requester_last_read_at IS NULL;

COMMIT;

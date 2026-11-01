BEGIN;

ALTER TABLE support_ticket_messages
  DROP CONSTRAINT IF EXISTS support_ticket_messages_author_role_check;

ALTER TABLE support_ticket_messages
  ADD CONSTRAINT support_ticket_messages_author_role_check
  CHECK (author_role IN ('user', 'admin', 'ai'));

-- Fixed system user used as author for AI support replies.
INSERT INTO users (
  id,
  email,
  full_name,
  password_hash,
  account_status,
  email_verified,
  created_at,
  updated_at
)
VALUES (
  'c0ffee00-a100-4000-8000-0000000000a1',
  'support-ai@system.local',
  'Support AI',
  NULL,
  'active',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    account_status = 'active',
    email_verified = TRUE,
    updated_at = NOW();

COMMIT;

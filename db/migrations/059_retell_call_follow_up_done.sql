-- Lets the dashboard voice report record that a caller's follow-up was handled.
ALTER TABLE retell_calls ADD COLUMN IF NOT EXISTS follow_up_done_at TIMESTAMPTZ;

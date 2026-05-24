ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS customer_email TEXT;

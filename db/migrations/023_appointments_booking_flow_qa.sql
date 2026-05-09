ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS booking_flow_qa JSONB;

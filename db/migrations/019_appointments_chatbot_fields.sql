-- Optional context captured from the public booking chatbot
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS service_description TEXT,
  ADD COLUMN IF NOT EXISTS party_size INTEGER,
  ADD COLUMN IF NOT EXISTS raw_message TEXT;

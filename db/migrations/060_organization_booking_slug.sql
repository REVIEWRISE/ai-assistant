-- Short public booking link: /book/<booking_slug>. Generated on first use.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS booking_slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS organizations_booking_slug_key ON organizations (booking_slug);

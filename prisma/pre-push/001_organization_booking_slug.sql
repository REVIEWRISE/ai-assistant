-- Runs before `prisma db push` (scripts/db-sync.sh). db push will not add a unique
-- constraint to an existing table without --accept-data-loss, so the column and its
-- unique index are created here first. Must stay idempotent: it runs on every start.
-- Same change as db/migrations/060_organization_booking_slug.sql.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS booking_slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS organizations_booking_slug_key ON organizations (booking_slug);

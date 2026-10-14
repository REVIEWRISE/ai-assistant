BEGIN;

-- Sessions created before token hashing stored the raw cookie value (a UUID).
-- Lookups now match only SHA-256 hashes (64 hex chars), so these rows can never
-- authenticate again; delete them so a leaked backup holds no usable tokens.
DELETE FROM sessions WHERE token !~ '^[0-9a-f]{64}$';

COMMIT;

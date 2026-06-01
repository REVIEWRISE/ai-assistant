ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS crm_sync_status TEXT NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS crm_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS crm_sync_attempts INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN appointments.crm_sync_status IS
  'CRM webhook: not_applicable, skipped_no_integration, synced, failed';
COMMENT ON COLUMN appointments.crm_sync_error IS 'Last CRM webhook error (truncated)';
COMMENT ON COLUMN appointments.crm_sync_attempts IS 'Delivery attempts including automatic retries';

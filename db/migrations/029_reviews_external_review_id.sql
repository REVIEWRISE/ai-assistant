ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS external_review_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_org_provider_external_review_id_idx
  ON reviews (organization_id, provider, external_review_id)
  WHERE external_review_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  positioning text NOT NULL DEFAULT '',
  monthly_price_cents integer NOT NULL CHECK (monthly_price_cents >= 0),
  yearly_price_cents integer NOT NULL CHECK (yearly_price_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  trial_days integer NOT NULL DEFAULT 14 CHECK (trial_days >= 0),
  included_locations integer NOT NULL DEFAULT 1 CHECK (included_locations >= 0),
  team_member_limit integer NOT NULL DEFAULT 1 CHECK (team_member_limit >= 0),
  included_voice_minutes integer NOT NULL DEFAULT 0 CHECK (included_voice_minutes >= 0),
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  stripe_monthly_price_id text,
  stripe_yearly_price_id text,
  featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_plans_active_sort_idx
  ON billing_plans (is_active, sort_order);

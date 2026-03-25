-- PRD gap migration: donations, winner optional columns, and subscription lifecycle fields.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Donations table for independent user donations.
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'succeeded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_charity_id ON donations(charity_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);

-- 2) Ensure winners table has all optional admin/publish columns.
ALTER TABLE winners ADD COLUMN IF NOT EXISTS matched_numbers INTEGER[] DEFAULT '{}';
ALTER TABLE winners ADD COLUMN IF NOT EXISTS submitted_scores INTEGER[] DEFAULT '{}';
ALTER TABLE winners ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE winners ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE winners ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE winners ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE winners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3) Subscription lifecycle fields on users table.
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'monthly';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_last_payment_at TIMESTAMPTZ;

-- 4) Draw jackpot rollover compatibility.
ALTER TABLE draws ADD COLUMN IF NOT EXISTS jackpot_rollover NUMERIC(12,2) DEFAULT 0;

-- 5) Helpful constraints/defaults for lifecycle status.
ALTER TABLE users
  ALTER COLUMN subscription_status SET DEFAULT 'pending';

-- Optional data backfill for active users without renewal date.
UPDATE users
SET subscription_renewal_date = COALESCE(
  subscription_renewal_date,
  CASE
    WHEN subscription_plan = 'yearly' THEN NOW() + INTERVAL '1 year'
    ELSE NOW() + INTERVAL '1 month'
  END
)
WHERE subscription_status = 'active';

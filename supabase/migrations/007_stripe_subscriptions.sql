-- Stripe subscriptions and billing system
-- Migration: 007_stripe_subscriptions.sql (IDEMPOTENT)

-- =========================================
-- 1) Profiles: subscription columns
-- =========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier   TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','premium','ultimate')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active','cancelled','past_due','unpaid','incomplete'));

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier   ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);

-- =========================================
-- 2) Subscriptions table (one per user)
-- =========================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  subscription_tier      TEXT NOT NULL CHECK (subscription_tier IN ('premium','ultimate')),
  status                 TEXT NOT NULL CHECK (status IN ('active','cancelled','past_due','unpaid','incomplete','trialing')),
  current_period_start   TIMESTAMPTZ NOT NULL,
  current_period_end     TIMESTAMPTZ NOT NULL,
  cancel_at              TIMESTAMPTZ,
  cancelled_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist even if table predated this migration
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS id                     UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id                UUID,
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier      TEXT,
  ADD COLUMN IF NOT EXISTS status                 TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at             TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ DEFAULT now();

-- One subscription per user (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uniq_subscriptions_user_id'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT uniq_subscriptions_user_id UNIQUE (user_id);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id          ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer  ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub       ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status           ON public.subscriptions(status);

-- =========================================
-- 3) Checkout sessions
-- =========================================
CREATE TABLE IF NOT EXISTS public.subscription_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id  TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  subscription_tier  TEXT NOT NULL CHECK (subscription_tier IN ('premium','ultimate')),
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','expired')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_sessions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_subscription_sessions_user_id   ON public.subscription_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_sessions_session   ON public.subscription_sessions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_subscription_sessions_status    ON public.subscription_sessions(status);

-- =========================================
-- 4) Payment history
-- =========================================
CREATE TABLE IF NOT EXISTS public.payment_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id       TEXT NOT NULL,
  stripe_subscription_id  TEXT NOT NULL,
  amount                  INTEGER NOT NULL, -- cents
  currency                TEXT NOT NULL DEFAULT 'usd',
  status                  TEXT NOT NULL CHECK (status IN ('succeeded','failed','pending')),
  billing_period_start    TIMESTAMPTZ NOT NULL,
  billing_period_end      TIMESTAMPTZ NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id         ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription    ON public.payment_history(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status          ON public.payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created         ON public.payment_history(created_at);

-- =========================================
-- 5) RLS & Policies (guarded)
-- =========================================
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history       ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions'
      AND policyname = 'Users can view their own subscription'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Users can view their own subscription"
      ON public.subscriptions
      FOR SELECT
      USING (auth.uid() = user_id)
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions'
      AND policyname = 'Service role can manage subscriptions'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Service role can manage subscriptions"
      ON public.subscriptions
      FOR ALL
      USING (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;

-- Subscription sessions policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscription_sessions'
      AND policyname = 'Users can view their own subscription sessions'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Users can view their own subscription sessions"
      ON public.subscription_sessions
      FOR SELECT
      USING (auth.uid() = user_id)
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscription_sessions'
      AND policyname = 'Service role can manage subscription sessions'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Service role can manage subscription sessions"
      ON public.subscription_sessions
      FOR ALL
      USING (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;

-- Payment history policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_history'
      AND policyname = 'Users can view their own payment history'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Users can view their own payment history"
      ON public.payment_history
      FOR SELECT
      USING (auth.uid() = user_id)
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_history'
      AND policyname = 'Service role can manage payment history'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Service role can manage payment history"
      ON public.payment_history
      FOR ALL
      USING (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;

-- =========================================
-- 6) Trigger helper + triggers (idempotent)
-- =========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'trigger_set_timestamp'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION trigger_set_timestamp()
      RETURNS trigger AS $body$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $body$ LANGUAGE plpgsql;
    $fn$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_timestamp_subscriptions         ON public.subscriptions;
CREATE TRIGGER set_timestamp_subscriptions
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_subscription_sessions ON public.subscription_sessions;
CREATE TRIGGER set_timestamp_subscription_sessions
  BEFORE UPDATE ON public.subscription_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- =========================================
-- 7) Functions (idempotent)
-- =========================================
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(p_user_id UUID)
RETURNS TABLE (
  tier TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.subscription_tier, p.subscription_tier) AS tier,
    COALESCE(s.status,            p.subscription_status) AS status,
    s.current_period_end,
    CASE 
      WHEN s.status = 'active' AND s.current_period_end > now() THEN true
      WHEN p.subscription_tier <> 'free' AND p.subscription_status = 'active' THEN true
      ELSE false
    END AS is_active
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.user_id
  WHERE p.user_id = p_user_id;
END;
$$;

-- keep parameter name EXACTLY: user_uuid
CREATE OR REPLACE FUNCTION public.has_premium_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  info RECORD;
BEGIN
  SELECT * INTO info FROM public.get_user_subscription_status(user_uuid);
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  RETURN info.is_active AND info.tier IN ('premium','ultimate');
END;
$$;

-- keep parameter name EXACTLY: user_uuid
CREATE OR REPLACE FUNCTION public.has_ultimate_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  info RECORD;
BEGIN
  SELECT * INTO info FROM public.get_user_subscription_status(user_uuid);
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  RETURN info.is_active AND info.tier = 'ultimate';
END;
$$;

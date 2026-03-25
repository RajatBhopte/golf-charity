-- Create or upgrade the charities table
CREATE TABLE IF NOT EXISTS public.charities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    image_url TEXT,
    description TEXT,
    upcoming_events JSONB DEFAULT '[]'::jsonb,
    is_spotlight BOOLEAN DEFAULT FALSE,
    total_raised NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS upcoming_events JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS is_spotlight BOOLEAN DEFAULT FALSE;
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS total_raised NUMERIC DEFAULT 0;
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create or upgrade the draws table
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year DATE NOT NULL,
    status TEXT DEFAULT 'simulated' CHECK (status IN ('simulated', 'published')),
    settings JSONB DEFAULT '{"type": "random"}'::jsonb,
    total_pool NUMERIC NOT NULL DEFAULT 0,
    pool_split JSONB DEFAULT '{"tier_5": 0.4, "tier_4": 0.35, "tier_3": 0.25}'::jsonb,
    winning_numbers INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    jackpot_rollover NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS month_year DATE;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'simulated';
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"type": "random"}'::jsonb;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS total_pool NUMERIC DEFAULT 0;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS pool_split JSONB DEFAULT '{"tier_5": 0.4, "tier_4": 0.35, "tier_3": 0.25}'::jsonb;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS winning_numbers INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS jackpot_rollover NUMERIC DEFAULT 0;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Create or upgrade the winners table
CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    prize_tier INTEGER CHECK (prize_tier IN (3, 4, 5)),
    amount NUMERIC NOT NULL,
    matched_numbers INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    submitted_scores INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    screenshot_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS draw_id UUID REFERENCES public.draws(id) ON DELETE CASCADE;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS prize_tier INTEGER;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS matched_numbers INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS submitted_scores INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create or upgrade notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create or upgrade winner audit logs
CREATE TABLE IF NOT EXISTS public.winner_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    winner_id UUID REFERENCES public.winners(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.winner_audit_logs ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.winners(id) ON DELETE CASCADE;
ALTER TABLE public.winner_audit_logs ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.winner_audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.winner_audit_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.winner_audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.winner_audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_audit_logs ENABLE ROW LEVEL SECURITY;

-- Public policies (safe to rerun)
DROP POLICY IF EXISTS "Anyone can view charities" ON public.charities;
DROP POLICY IF EXISTS "Anyone can view published draws" ON public.draws;
DROP POLICY IF EXISTS "Users can view their own wins" ON public.winners;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Anyone can view charities" ON public.charities FOR SELECT USING (true);
CREATE POLICY "Anyone can view published draws" ON public.draws FOR SELECT USING (status = 'published');
CREATE POLICY "Users can view their own wins" ON public.winners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies rely on backend service-role access.

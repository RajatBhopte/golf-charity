-- Create the users table in the public schema
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  subscription_plan TEXT DEFAULT 'monthly' CHECK (subscription_plan IN ('monthly', 'yearly')),
  charity_id UUID,
  charity_percentage INTEGER DEFAULT 10,
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT -- Optional, but helpful for internal scripts
);

-- Backfill columns for existing databases
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'monthly';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS charity_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS charity_percentage INTEGER DEFAULT 10;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- 3. Service role (backend) can do anything
-- (This is already true for service_role keys, but explicitly mentioned here)

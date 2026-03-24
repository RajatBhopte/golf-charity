-- Create the scores table in the public schema
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 1 AND score <= 45),
  played_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- 1. Users can insert their own scores
CREATE POLICY "Users can insert own scores" 
ON public.scores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Users can view their own scores
CREATE POLICY "Users can view own scores" 
ON public.scores 
FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Users can update their own scores
CREATE POLICY "Users can update own scores" 
ON public.scores 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Users can delete their own scores
CREATE POLICY "Users can delete own scores" 
ON public.scores 
FOR DELETE 
USING (auth.uid() = user_id);

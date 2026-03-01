
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'Other',
  sells_food BOOLEAN NOT NULL DEFAULT false,
  sells_alcohol BOOLEAN NOT NULL DEFAULT false,
  has_location BOOLEAN NOT NULL DEFAULT false,
  address TEXT DEFAULT '',
  area TEXT DEFAULT 'Loop',
  budget NUMERIC DEFAULT 0,
  employees INTEGER DEFAULT 1,
  launch_date DATE,
  rent_budget NUMERIC DEFAULT 0,
  sqft INTEGER DEFAULT 0,
  target_customers TEXT DEFAULT '',
  avg_ticket NUMERIC DEFAULT 0,
  daily_customers INTEGER DEFAULT 0,
  operating_hours TEXT DEFAULT '09:00-17:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own businesses"
ON public.businesses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own businesses"
ON public.businesses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own businesses"
ON public.businesses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own businesses"
ON public.businesses FOR DELETE
USING (auth.uid() = user_id);

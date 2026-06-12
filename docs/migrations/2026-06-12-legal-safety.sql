-- Run this in the Supabase SQL editor (or via your migration tool).
-- Adds route expiry plus an acknowledgements table for the safety modal.

-- 1. Add expires_at column to routes
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS expires_at date;

-- 2. Create acknowledgements table
CREATE TABLE IF NOT EXISTS public.acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  share_token text NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS acknowledgements_route_id_idx
  ON public.acknowledgements(route_id);

-- 3. Grants (Supabase Data API does not grant these by default)
GRANT INSERT ON public.acknowledgements TO anon;
GRANT SELECT, INSERT ON public.acknowledgements TO authenticated;
GRANT ALL ON public.acknowledgements TO service_role;

-- 4. RLS
ALTER TABLE public.acknowledgements ENABLE ROW LEVEL SECURITY;

-- Anyone (auth or anon) may insert an acknowledgement.
DROP POLICY IF EXISTS "Anyone can insert acknowledgements" ON public.acknowledgements;
CREATE POLICY "Anyone can insert acknowledgements"
  ON public.acknowledgements
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only the route owner may read acknowledgements for their own routes.
DROP POLICY IF EXISTS "Route owners can read their acknowledgements" ON public.acknowledgements;
CREATE POLICY "Route owners can read their acknowledgements"
  ON public.acknowledgements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = acknowledgements.route_id
        AND r.user_id = auth.uid()
    )
  );
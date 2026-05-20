-- Add beta_status to users table for beta access gating
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS beta_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (beta_status IN ('pending', 'approved', 'denied'));

-- Existing users are already approved (they're already using the app)
-- New sign-ups will default to 'pending' once you're ready to gate new users.
-- To switch new sign-ups to pending, run:
--   ALTER TABLE public.users ALTER COLUMN beta_status SET DEFAULT 'pending';

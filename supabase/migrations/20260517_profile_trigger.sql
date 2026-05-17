-- ============================================================
-- Auto-create public.users profile on new auth.users signup
-- ============================================================
-- This trigger fires whenever Supabase creates a new auth user
-- (email/password signup, OAuth, magic link, etc.).
-- It pulls name and country from raw_user_meta_data, which is
-- set via the `options.data` field in supabase.auth.signUp().
--
-- This is the server-side safety net so a profile row ALWAYS
-- exists, even if the client-side upsert in signup/page.tsx
-- never executes (tab close, network drop, etc.).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, country)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'country', 'US')::text
  )
  ON CONFLICT (id) DO NOTHING;  -- no-op if client-side insert already ran
  RETURN NEW;
END;
$$;

-- Drop existing trigger if present, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Also add expense_form_data column if not already present
-- (needed for cross-device archive form sync)
-- ============================================================
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS expense_form_data JSONB DEFAULT NULL;

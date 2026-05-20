-- Soft-delete marker for user accounts.
-- Keeps all metadata/analytics intact; only auth.users is hard-deleted on account removal.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

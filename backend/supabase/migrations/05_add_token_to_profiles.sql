-- Add token column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS token TEXT;

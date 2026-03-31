-- Add governorate column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS governorate TEXT;

-- Update existing records to empty if needed
-- (Default is NULL)

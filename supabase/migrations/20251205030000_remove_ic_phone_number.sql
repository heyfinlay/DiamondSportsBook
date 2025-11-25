-- Remove deprecated ic_phone_number column now that data lives in ic_number
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS ic_phone_number;

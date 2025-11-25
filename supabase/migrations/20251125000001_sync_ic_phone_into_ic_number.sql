-- Ensure ic_number remains the single source of truth
UPDATE public.profiles
SET ic_number = COALESCE(ic_number, ic_phone_number)
WHERE ic_number IS NULL
  AND ic_phone_number IS NOT NULL;

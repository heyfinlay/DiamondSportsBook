-- Ensure ic_number remains the single source of truth
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'ic_phone_number'
  ) THEN
    UPDATE public.profiles
    SET ic_number = COALESCE(ic_number, ic_phone_number)
    WHERE ic_number IS NULL
      AND ic_phone_number IS NOT NULL;
  END IF;
END
$$;

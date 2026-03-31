CREATE OR REPLACE FUNCTION public.sports_is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    COALESCE(
      NULLIF(current_setting('request.jwt.claim.role', true), ''),
      CASE
        WHEN COALESCE(current_setting('request.jwt.claims', true), '') <> ''
          THEN NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '')
        ELSE NULL
      END,
      NULLIF(auth.role(), ''),
      CASE
        WHEN auth.jwt() IS NULL THEN NULL
        ELSE NULLIF(auth.jwt() ->> 'role', '')
      END
    ) = 'service_role',
    false
  );
$$;

COMMENT ON FUNCTION public.sports_is_service_role()
IS 'Returns true when the request JWT resolves to the service_role, across both legacy and claims-json request contexts.';

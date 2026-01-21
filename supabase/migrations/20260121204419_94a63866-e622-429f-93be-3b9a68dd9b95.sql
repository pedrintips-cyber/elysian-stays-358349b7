-- Tighten public booking insert policy (avoid WITH CHECK (true))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND policyname = 'Qualquer pessoa pode criar reservas '
  ) THEN
    EXECUTE 'DROP POLICY "Qualquer pessoa pode criar reservas " ON public.bookings';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND policyname = 'Qualquer pessoa pode criar reservas'
  ) THEN
    EXECUTE 'DROP POLICY "Qualquer pessoa pode criar reservas" ON public.bookings';
  END IF;
END $$;

CREATE POLICY "Qualquer pessoa pode criar reservas"
ON public.bookings
FOR INSERT
WITH CHECK (
  guest_email IS NOT NULL
  AND guest_name IS NOT NULL
  AND nights IS NOT NULL
  AND nights >= 1
  AND total_price IS NOT NULL
  AND total_price > 0
  AND price_per_night IS NOT NULL
  AND price_per_night > 0
  AND property_id IS NOT NULL
);

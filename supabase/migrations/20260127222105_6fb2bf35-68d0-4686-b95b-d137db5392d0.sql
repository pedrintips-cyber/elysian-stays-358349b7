-- Fix bookings INSERT RLS: allow guest checkout (user_id null) and logged-in checkout (user_id = auth.uid())
DROP POLICY IF EXISTS "Qualquer pessoa pode criar reservas" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;

CREATE POLICY "Anyone can create bookings (guest or authed)"
ON public.bookings
FOR INSERT
WITH CHECK (
  (guest_email IS NOT NULL)
  AND (guest_name IS NOT NULL)
  AND (nights IS NOT NULL)
  AND (nights >= 1)
  AND (total_price IS NOT NULL)
  AND (total_price > 0)
  AND (price_per_night IS NOT NULL)
  AND (price_per_night > 0)
  AND (property_id IS NOT NULL)
  AND (
    user_id IS NULL
    OR auth.uid() = user_id
  )
);
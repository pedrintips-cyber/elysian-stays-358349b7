-- Tighten bookings visibility: remove insecure public read-by-email policy
DROP POLICY IF EXISTS "Qualquer pessoa pode ver reservas por email" ON public.bookings;

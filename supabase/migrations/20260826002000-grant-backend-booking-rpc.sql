-- Permite a criação de bookings apenas ao backend privilegiado.
-- anon/authenticated permanecem sem EXECUTE.

grant execute on function public.create_public_booking_v2(
  uuid, jsonb, text, text, integer, integer, integer, integer, text, text, text, text, date, text
) to service_role;

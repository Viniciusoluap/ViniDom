-- Revogação explícita do papel PUBLIC para manter a regra de privilégios
-- reproduzível em novos ambientes.

revoke execute on function public.create_public_booking(
  uuid, jsonb, text, text, integer, integer, integer, text, text, text, text, text, date, text
) from public, anon, authenticated;
revoke execute on function public.get_booked_slots(text) from public, anon, authenticated;
revoke execute on function public.get_public_booking(uuid) from public, anon, authenticated;
revoke execute on function public.get_booked_slots_v2(text) from public, anon, authenticated;
revoke execute on function public.get_public_booking_v2(uuid) from public, anon, authenticated;
revoke execute on function public.create_public_booking_v2(
  uuid, jsonb, text, text, integer, integer, integer, integer, text, text, text, text, date, text
) from public, anon, authenticated;
grant execute on function public.create_public_booking_v2(
  uuid, jsonb, text, text, integer, integer, integer, integer, text, text, text, text, date, text
) to service_role;

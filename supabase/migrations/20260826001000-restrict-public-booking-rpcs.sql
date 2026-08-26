-- Endurecimento das RPCs legadas e v2 após migração para rotas server-side.
-- O frontend de produção não chama mais estas funções diretamente.

revoke execute on function public.create_public_booking(
  uuid, jsonb, text, text, integer, integer, integer, text, text, text, text, date, text
) from anon, authenticated;

revoke execute on function public.get_booked_slots(text) from anon, authenticated;
revoke execute on function public.get_public_booking(uuid) from anon, authenticated;
revoke execute on function public.get_booked_slots_v2(text) from anon, authenticated;
revoke execute on function public.get_public_booking_v2(uuid) from anon, authenticated;
revoke execute on function public.create_public_booking_v2(
  uuid, jsonb, text, text, integer, integer, integer, integer, text, text, text, text, date, text
) from anon, authenticated;

-- Vini Dom: sincronização idempotente de bookings com Google Calendar.
-- Migration aditiva: não remove nem reescreve reservas existentes.

alter table public.bookings
  add column if not exists operational_duration integer,
  add column if not exists google_calendar_id text,
  add column if not exists google_event_id text,
  add column if not exists calendar_sync_status text default 'pending',
  add column if not exists calendar_sync_error text,
  add column if not exists calendar_synced_at timestamptz,
  add column if not exists updated_at timestamptz default now();

update public.bookings
   set operational_duration = case
     when total_duration = 90 then 120
     else total_duration
   end
 where operational_duration is null;

update public.bookings
   set calendar_sync_status = coalesce(calendar_sync_status, 'pending')
 where calendar_sync_status is null;

create index if not exists bookings_calendar_sync_status_idx
  on public.bookings (calendar_sync_status, date_key, time_slot)
  where status <> 'cancelled';

create unique index if not exists bookings_google_event_uidx
  on public.bookings (google_calendar_id, google_event_id)
  where google_calendar_id is not null and google_event_id is not null;

create or replace function public.create_public_booking_v2(
  p_id uuid,
  p_services jsonb,
  p_date text,
  p_date_key text,
  p_time_slot integer,
  p_total_duration integer,
  p_operational_duration integer,
  p_total_price integer,
  p_client_name text,
  p_client_phone text,
  p_client_email text default null,
  p_client_notes text default null,
  p_client_birthdate date default null,
  p_professional_name text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  inserted_id uuid;
begin
  if p_id is null
     or p_services is null
     or jsonb_typeof(p_services) <> 'array'
     or jsonb_array_length(p_services) = 0
     or p_date_key !~ '^\d{4}-\d{2}-\d{2}$'
     or p_time_slot < 0
     or p_time_slot > 1439
     or p_total_duration < 15
     or p_total_duration > 720
     or p_operational_duration < 15
     or p_operational_duration > 720
     or p_total_price < 0
     or p_client_name is null
     or length(trim(p_client_name)) < 2
     or p_client_phone is null
     or p_client_phone !~ '^[0-9()+ .-]{8,20}$'
  then
    raise exception 'Dados de agendamento inválidos' using errcode = '22023';
  end if;

  -- Serializa reservas do mesmo dia para reduzir corrida entre clientes simultâneos.
  perform pg_advisory_xact_lock(hashtextextended(p_date_key, 0));

  if exists (
    select 1
      from public.bookings b
     where b.date_key = p_date_key
       and b.status <> 'cancelled'
       and p_time_slot < b.time_slot + coalesce(
         b.operational_duration,
         case when b.total_duration = 90 then 120 else b.total_duration end
       )
       and b.time_slot < p_time_slot + p_operational_duration
  ) then
    raise exception 'Horário indisponível' using errcode = '23P01';
  end if;

  insert into public.bookings (
    id, services, date, date_key, time_slot, total_duration, operational_duration,
    total_price, client_name, client_phone, client_email, client_notes,
    client_birthdate, professional_name, status, calendar_sync_status, updated_at
  ) values (
    p_id, p_services, p_date, p_date_key, p_time_slot, p_total_duration,
    p_operational_duration, p_total_price, trim(p_client_name), trim(p_client_phone),
    nullif(trim(p_client_email), ''), nullif(trim(p_client_notes), ''),
    p_client_birthdate, nullif(trim(p_professional_name), ''), 'confirmed', 'pending', now()
  )
  returning id into inserted_id;

  return inserted_id;
end;
$function$;

create or replace function public.get_booked_slots_v2(p_date_key text)
returns table(time_slot integer, operational_duration integer)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select b.time_slot,
         coalesce(
           b.operational_duration,
           case when b.total_duration = 90 then 120 else b.total_duration end
         ) as operational_duration
    from public.bookings b
   where b.date_key = p_date_key
     and b.status <> 'cancelled'
   order by b.time_slot;
$function$;

create or replace function public.get_public_booking_v2(p_id uuid)
returns table(
  id uuid,
  services jsonb,
  date text,
  date_key text,
  time_slot integer,
  total_duration integer,
  operational_duration integer,
  total_price integer,
  client_name text,
  professional_name text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select b.id, b.services, b.date, b.date_key, b.time_slot,
         b.total_duration,
         coalesce(
           b.operational_duration,
           case when b.total_duration = 90 then 120 else b.total_duration end
         ) as operational_duration,
         b.total_price, b.client_name, b.professional_name, b.status, b.created_at
    from public.bookings b
   where b.id = p_id
   limit 1;
$function$;

revoke all on function public.create_public_booking_v2(uuid, jsonb, text, text, integer, integer, integer, integer, text, text, text, text, date, text) from public;
grant execute on function public.create_public_booking_v2(uuid, jsonb, text, text, integer, integer, integer, integer, text, text, text, text, date, text) to anon, authenticated;

revoke all on function public.get_booked_slots_v2(text) from public;
grant execute on function public.get_booked_slots_v2(text) to anon, authenticated;

revoke all on function public.get_public_booking_v2(uuid) from public;
grant execute on function public.get_public_booking_v2(uuid) to anon, authenticated;

-- ViniDom security hardening
-- Public booking creation and availability are exposed through narrowly-scoped RPCs.
-- Administrative operations require Supabase Auth and role claims.

create or replace function public.create_public_booking(
  p_id uuid,
  p_services jsonb,
  p_date text,
  p_date_key text,
  p_time_slot integer,
  p_total_duration integer,
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
set search_path = public, pg_temp
as $$
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
     or p_total_price < 0
     or p_client_name is null
     or length(trim(p_client_name)) < 2
     or p_client_phone is null
     or p_client_phone !~ '^[0-9()+ .-]{8,20}$'
  then
    raise exception 'Dados de agendamento inválidos' using errcode = '22023';
  end if;

  if exists (
    select 1
      from public.bookings b
     where b.date_key = p_date_key
       and b.status <> 'cancelled'
       and p_time_slot < b.time_slot + b.total_duration
       and b.time_slot < p_time_slot + p_total_duration
  ) then
    raise exception 'Horário indisponível' using errcode = '23P01';
  end if;

  insert into public.bookings (
    id, services, date, date_key, time_slot, total_duration, total_price,
    client_name, client_phone, client_email, client_notes, client_birthdate,
    professional_name, status
  ) values (
    p_id, p_services, p_date, p_date_key, p_time_slot, p_total_duration, p_total_price,
    trim(p_client_name), trim(p_client_phone), nullif(trim(p_client_email), ''),
    nullif(trim(p_client_notes), ''), p_client_birthdate, nullif(trim(p_professional_name), ''),
    'confirmed'
  )
  returning id into inserted_id;

  return inserted_id;
 end;
$$;

create or replace function public.get_booked_slots(p_date_key text)
returns table(time_slot integer, total_duration integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.time_slot, b.total_duration
    from public.bookings b
   where b.date_key = p_date_key
     and b.status <> 'cancelled'
   order by b.time_slot;
$$;

create or replace function public.get_public_booking(p_id uuid)
returns table(
  id uuid,
  services jsonb,
  date text,
  date_key text,
  time_slot integer,
  total_duration integer,
  total_price integer,
  client_name text,
  professional_name text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.id, b.services, b.date, b.date_key, b.time_slot, b.total_duration,
         b.total_price, b.client_name, b.professional_name, b.status, b.created_at
    from public.bookings b
   where b.id = p_id
   limit 1;
$$;

revoke all on function public.create_public_booking(uuid, jsonb, text, text, integer, integer, integer, text, text, text, text, date, text) from public;
revoke all on function public.get_booked_slots(text) from public;
revoke all on function public.get_public_booking(uuid) from public;
grant execute on function public.create_public_booking(uuid, jsonb, text, text, integer, integer, integer, text, text, text, text, date, text) to anon, authenticated;
grant execute on function public.get_booked_slots(text) to anon, authenticated;
grant execute on function public.get_public_booking(uuid) to anon, authenticated;

alter table public.bookings enable row level security;

drop policy if exists "anon_select" on public.bookings;
drop policy if exists "anon_insert" on public.bookings;
drop policy if exists "anon_update" on public.bookings;
drop policy if exists "anon_delete" on public.bookings;
drop policy if exists "authenticated_read_bookings" on public.bookings;
drop policy if exists "admin_manage_bookings" on public.bookings;
drop policy if exists "staff_read_own_bookings" on public.bookings;
drop policy if exists "staff_update_own_bookings" on public.bookings;

revoke all on table public.bookings from anon;
grant select, update, delete on table public.bookings to authenticated;

create policy "authenticated_read_bookings"
  on public.bookings for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
      and professional_name = auth.jwt() -> 'app_metadata' ->> 'professional_name'
    )
  );

create policy "admin_manage_bookings"
  on public.bookings for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "staff_update_own_bookings"
  on public.bookings for update to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
    and professional_name = auth.jwt() -> 'app_metadata' ->> 'professional_name'
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
    and professional_name = auth.jwt() -> 'app_metadata' ->> 'professional_name'
  );

-- Remove the table from realtime until authenticated channel filters are configured.
alter publication supabase_realtime drop table public.bookings;

-- Independent administrative directory. Existing booking snapshots remain compatible.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 3 and 120),
  phone text not null unique check (phone ~ '^[1-9][0-9]{9,10}$'),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  birthdate date check (birthdate is null or birthdate between date '1900-01-01' and current_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clients enable row level security;
revoke all on public.clients from anon, authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
create policy admin_manage_clients on public.clients for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create function public.client_phone_key(p_phone text)
returns text language sql immutable security invoker set search_path = '' as $$
  with digits as (select regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') as value)
  select case when length(value) in (12, 13) and left(value, 2) = '55'
    then substring(value from 3) else value end from digits;
$$;
revoke all on function public.client_phone_key(text) from public, anon;
grant execute on function public.client_phone_key(text) to authenticated;

-- A single transaction updates the master record and every exact-phone snapshot.
-- Invoker security preserves the existing booking RLS and never elevates privileges.
create function public.save_admin_client(
  p_original_phone text, p_name text, p_phone text, p_email text, p_birthdate date
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_phone text := public.client_phone_key(p_phone);
  v_original text := case when p_original_phone is null then null else public.client_phone_key(p_original_phone) end;
  v_client public.clients%rowtype;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Não autorizado.' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) not between 3 and 120
     or v_phone !~ '^[1-9][0-9]{9,10}$'
     or (nullif(trim(p_email), '') is not null and (length(trim(p_email)) > 254 or trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
     or (p_birthdate is not null and (p_birthdate < date '1900-01-01' or p_birthdate > current_date)) then
    raise exception 'Dados do cliente inválidos.' using errcode = '22023';
  end if;
  -- Serialize edits involving the same phones, with consistent ordering to avoid deadlocks.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vinidom-client:' || least(v_phone, coalesce(v_original, v_phone)), 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vinidom-client:' || greatest(v_phone, coalesce(v_original, v_phone)), 0));

  if v_original is not null then
    select * into v_client from public.clients where phone = v_original for update;
    if v_client.id is null and not exists (
      select 1 from public.bookings where public.client_phone_key(client_phone) = v_original
    ) then
      raise exception 'Cliente não encontrado. Atualize a lista e tente novamente.' using errcode = 'P0002';
    end if;
  end if;
  if v_original is null or v_phone <> v_original then
    if exists (select 1 from public.clients where phone = v_phone)
       or exists (select 1 from public.bookings where public.client_phone_key(client_phone) = v_phone) then
      raise exception 'Já existe um cliente com este WhatsApp. Edite o cadastro existente.' using errcode = '23505';
    end if;
  end if;

  if v_client.id is null then
    insert into public.clients (name, phone, email, birthdate)
    values (trim(p_name), v_phone, nullif(trim(p_email), ''), p_birthdate) returning * into v_client;
  else
    update public.clients set name = trim(p_name), phone = v_phone,
      email = nullif(trim(p_email), ''), birthdate = p_birthdate, updated_at = now()
    where id = v_client.id returning * into v_client;
  end if;
  if v_original is not null then
    update public.bookings set client_name = v_client.name, client_phone = v_client.phone,
      client_email = v_client.email, client_birthdate = v_client.birthdate, updated_at = now()
    where public.client_phone_key(client_phone) = v_original;
  end if;
  return jsonb_build_object('id', v_client.id, 'name', v_client.name, 'phone', v_client.phone,
    'email', v_client.email, 'birthdate', v_client.birthdate);
end;
$$;
revoke all on function public.save_admin_client(text, text, text, text, date) from public, anon;
grant execute on function public.save_admin_client(text, text, text, text, date) to authenticated;

-- Preserves the existing, explicitly confirmed delete behavior, now with exact matching.
create function public.delete_admin_client(p_phone text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_phone text := public.client_phone_key(p_phone);
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Não autorizado.' using errcode = '42501';
  end if;
  if v_phone !~ '^[1-9][0-9]{9,10}$' then
    raise exception 'WhatsApp inválido.' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vinidom-client:' || v_phone, 0));
  delete from public.bookings where public.client_phone_key(client_phone) = v_phone;
  delete from public.clients where phone = v_phone;
end;
$$;
revoke all on function public.delete_admin_client(text) from public, anon;
grant execute on function public.delete_admin_client(text) to authenticated;

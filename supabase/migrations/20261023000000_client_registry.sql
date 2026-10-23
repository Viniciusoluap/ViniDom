-- Cadastros independentes de reservas, identificados pelo WhatsApp normalizado.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  phone_digits text not null unique check (phone_digits ~ '^[0-9]{10,11}$'),
  name text not null check (length(trim(name)) >= 3),
  phone text not null,
  email text,
  birthdate date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;
revoke all on public.clients from anon;
grant select, insert, update on public.clients to authenticated;

create policy "team_read_clients" on public.clients for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'staff'));
create policy "team_insert_clients" on public.clients for insert to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'staff'));
create policy "team_update_clients" on public.clients for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'staff'))
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'staff'));

-- Importa clientes com agendamentos anteriores uma única vez, sem alterar reservas.
insert into public.clients (phone_digits, name, phone, email, birthdate, notes)
select distinct on (regexp_replace(client_phone, '[^0-9]', '', 'g'))
  regexp_replace(client_phone, '[^0-9]', '', 'g'),
  trim(client_name), client_phone, nullif(client_email, ''), client_birthdate, client_notes
from public.bookings
where length(regexp_replace(client_phone, '[^0-9]', '', 'g')) between 10 and 11
  and length(trim(client_name)) >= 3
order by regexp_replace(client_phone, '[^0-9]', '', 'g'), created_at desc
on conflict (phone_digits) do nothing;

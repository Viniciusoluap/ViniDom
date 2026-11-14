-- Configurações de integração (WhatsApp Business API, WhatsApp Web, etc.)
-- editáveis pelo painel administrativo, sem depender de variáveis da Vercel.

create table if not exists public.integration_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.integration_settings enable row level security;

drop policy if exists "admin_manage_integration_settings" on public.integration_settings;
create policy "admin_manage_integration_settings"
  on public.integration_settings for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

revoke all on table public.integration_settings from anon;
revoke all on table public.integration_settings from authenticated;
grant select, insert, update, delete on table public.integration_settings to authenticated;

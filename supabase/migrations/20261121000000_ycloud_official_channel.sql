-- API Oficial do WhatsApp (YCloud): eventos já recebidos (a YCloud reenvia quando não recebe resposta)
-- e trava por conversa, para a Vicky responder uma vez só quando chegam várias mensagens seguidas.
create table if not exists public.webhook_events (
  id text primary key,
  type text,
  received_at timestamptz not null default now()
);
alter table public.webhook_events enable row level security;
revoke all on public.webhook_events from anon, authenticated;

alter table public.agent_chats add column if not exists busy_until timestamptz;

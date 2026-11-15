-- Agente de atendimento no WhatsApp: histórico, pausa por atendimento humano
-- e registro de mensagens automáticas (para nunca repetir o mesmo envio).

create table if not exists public.agent_messages (
  id bigint generated always as identity primary key,
  chat_jid text not null,
  phone_digits text,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_messages_phone_idx on public.agent_messages (phone_digits, created_at desc);
create index if not exists agent_messages_jid_idx on public.agent_messages (chat_jid, created_at desc);

create table if not exists public.agent_chats (
  chat_jid text primary key,
  phone_digits text,
  paused_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_outbound_log (
  kind text not null,
  ref text not null,
  phone_digits text,
  sent_at timestamptz not null default now(),
  primary key (kind, ref)
);
create index if not exists agent_outbound_log_phone_idx on public.agent_outbound_log (phone_digits, sent_at desc);

alter table public.bookings add column if not exists client_confirmed_at timestamptz;

-- Somente o backend (service_role) acessa estas tabelas.
alter table public.agent_messages enable row level security;
alter table public.agent_chats enable row level security;
alter table public.agent_outbound_log enable row level security;
revoke all on public.agent_messages, public.agent_chats, public.agent_outbound_log from anon, authenticated;

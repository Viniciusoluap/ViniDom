-- Quem escreveu cada mensagem da conversa:
-- client (cliente), agent (agente IA), human (Vinicius, pelo celular ou pelo painel),
-- auto (mensagem automática do cron) e bulk (disparo em massa do painel).
alter table public.agent_messages add column if not exists source text;

update public.agent_messages set source = 'client' where source is null and role = 'user';
update public.agent_messages set source = 'agent' where source is null and role = 'assistant';

-- Nome exibido no WhatsApp do contato, para a lista de conversas do painel.
alter table public.agent_chats add column if not exists contact_name text;

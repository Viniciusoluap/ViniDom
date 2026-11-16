-- Fotos, áudios, vídeos e arquivos recebidos no WhatsApp aparecem na tela de Conversas.
alter table public.agent_messages
  add column if not exists media_type text check (media_type in ('image', 'audio', 'video', 'document', 'sticker')),
  add column if not exists media_path text,
  add column if not exists media_mime text;

-- Bucket privado: os arquivos só são lidos pelo servidor, que entrega links temporários ao painel.
insert into storage.buckets (id, name, public, file_size_limit)
values ('whatsapp-media', 'whatsapp-media', false, 3145728)
on conflict (id) do nothing;

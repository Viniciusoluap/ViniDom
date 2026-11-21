import { getAdminClient, parseBody, requireAdmin, sendJson } from '../src/server/supabaseServer.js';
import { maskPhone, normalizePhoneDigits } from '../src/server/agentUtils.js';
import { logAgentMessage, pauseChat } from './_whatsapp.js';
import { channelReady, getChannel, sendMessages } from './_channel.js';
import { removeMedia, signMediaUrls } from './_media.js';

const LIST_DAYS = 60;
const THREAD_LIMIT = 300;
const MAX_TEXT = 4000;
const MAX_DELETE = 200;

// Uma conversa é identificada pelo telefone (DDD + número) ou, sem telefone conhecido, pelo JID do WhatsApp.
function parseKey(value) {
  const key = String(value || '').trim().slice(0, 120);
  if (!key) return null;
  const phoneDigits = /^[0-9]{10,11}$/.test(key) ? key : null;
  return { key, phoneDigits, chatJid: phoneDigits ? `55${phoneDigits}@s.whatsapp.net` : key };
}

function chatFilter(query, chat) {
  return chat.phoneDigits ? query.eq('phone_digits', chat.phoneDigits) : query.eq('chat_jid', chat.chatJid);
}

async function listChats(supabase) {
  const since = new Date(Date.now() - LIST_DAYS * 86400_000).toISOString();
  const [messagesResult, chatsResult] = await Promise.all([
    supabase.from('agent_messages').select('chat_jid, phone_digits, role, source, content, created_at')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(3000),
    supabase.from('agent_chats').select('chat_jid, phone_digits, contact_name, paused_until').limit(2000),
  ]);
  if (messagesResult.error || chatsResult.error) throw new Error('Falha ao carregar conversas.');

  const chats = new Map();
  for (const row of messagesResult.data || []) {
    const key = row.phone_digits || row.chat_jid;
    if (!chats.has(key)) {
      chats.set(key, {
        key,
        phoneDigits: row.phone_digits || null,
        lastMessage: row.content.slice(0, 120),
        lastSource: row.source || (row.role === 'user' ? 'client' : 'agent'),
        lastAt: row.created_at,
        name: null,
        paused: false,
      });
    }
  }

  const now = Date.now();
  for (const info of chatsResult.data || []) {
    const chat = chats.get(info.phone_digits || info.chat_jid) || chats.get(info.chat_jid);
    if (!chat) continue;
    chat.name = chat.name || info.contact_name || null;
    if (info.paused_until && new Date(info.paused_until).getTime() > now) chat.paused = true;
  }

  const phones = [...chats.values()].map((chat) => chat.phoneDigits).filter(Boolean);
  if (phones.length) {
    const { data: clients } = await supabase.from('clients').select('phone_digits, name').in('phone_digits', phones);
    for (const client of clients || []) {
      const chat = chats.get(client.phone_digits);
      if (chat) chat.name = client.name;
    }
  }

  return [...chats.values()].map((chat) => ({
    ...chat,
    phone: chat.phoneDigits ? maskPhone(chat.phoneDigits) : null,
    name: chat.name || (chat.phoneDigits ? maskPhone(chat.phoneDigits) : 'Contato sem número'),
  }));
}

async function loadThread(supabase, chat) {
  const { data, error } = await chatFilter(
    supabase.from('agent_messages').select('id, role, source, content, created_at, media_type, media_path, media_mime'), chat,
  ).order('created_at', { ascending: false }).limit(THREAD_LIMIT);
  if (error) throw new Error('Falha ao carregar a conversa.');
  const rows = (data || []).reverse();
  const urls = await signMediaUrls(supabase, rows.map((row) => row.media_path));
  return rows.map((row) => ({
    id: row.id,
    source: row.source || (row.role === 'user' ? 'client' : 'agent'),
    content: row.content,
    createdAt: row.created_at,
    media: row.media_type ? { type: row.media_type, mime: row.media_mime, url: urls.get(row.media_path) || null } : null,
  }));
}

// Apaga o histórico das conversas (mensagens e arquivos). O cadastro do cliente e os agendamentos ficam.
async function deleteChats(supabase, chats) {
  for (const chat of chats) {
    const { data, error } = await chatFilter(supabase.from('agent_messages').select('media_path'), chat).not('media_path', 'is', null);
    if (error) throw new Error('Falha ao localizar arquivos da conversa.');
    await removeMedia(supabase, (data || []).map((row) => row.media_path));
    const { error: deleteError } = await chatFilter(supabase.from('agent_messages').delete(), chat);
    if (deleteError) throw new Error('Falha ao apagar a conversa.');
    const filters = [`chat_jid.eq."${chat.chatJid.replace(/"/g, '')}"`];
    if (chat.phoneDigits) filters.push(`phone_digits.eq.${chat.phoneDigits}`);
    await supabase.from('agent_chats').delete().or(filters.join(','));
  }
}

async function isPaused(supabase, chat) {
  const filters = [`chat_jid.eq."${chat.chatJid.replace(/"/g, '')}"`];
  if (chat.phoneDigits) filters.push(`phone_digits.eq.${chat.phoneDigits}`);
  const { data } = await supabase.from('agent_chats').select('paused_until').or(filters.join(','));
  return (data || []).some((row) => row.paused_until && new Date(row.paused_until).getTime() > Date.now());
}

async function resumeChat(supabase, chat) {
  const filters = [`chat_jid.eq."${chat.chatJid.replace(/"/g, '')}"`];
  if (chat.phoneDigits) filters.push(`phone_digits.eq.${chat.phoneDigits}`);
  await supabase.from('agent_chats').update({ paused_until: null, updated_at: new Date().toISOString() }).or(filters.join(','));
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  const auth = await requireAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { error: auth.error });

  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor não configurado.' });

  try {
    if (req.method === 'GET') {
      const chat = parseKey(req.query?.key);
      if (!chat) return sendJson(res, 200, { chats: await listChats(supabase) });
      const [messages, paused] = await Promise.all([loadThread(supabase, chat), isPaused(supabase, chat)]);
      return sendJson(res, 200, { messages, paused });
    }

    const body = parseBody(req) || {};

    if (body.action === 'delete') {
      const keys = Array.isArray(body.keys) ? body.keys : [];
      const chats = [...new Map(keys.map(parseKey).filter(Boolean).map((c) => [c.key, c])).values()];
      if (!chats.length || chats.length > MAX_DELETE) return sendJson(res, 400, { error: 'Selecione de 1 a 200 conversas.' });
      await deleteChats(supabase, chats);
      return sendJson(res, 200, { deleted: chats.length });
    }

    const chat = parseKey(body.key);
    if (!chat) return sendJson(res, 400, { error: 'Conversa inválida.' });

    if (body.action === 'pause') {
      await pauseChat(supabase, { chatJid: chat.chatJid, phoneDigits: chat.phoneDigits, hours: 24 * 30 });
      return sendJson(res, 200, { paused: true });
    }

    if (body.action === 'resume') {
      await resumeChat(supabase, chat);
      return sendJson(res, 200, { paused: false });
    }

    if (body.action === 'send') {
      const text = String(body.text || '').trim();
      if (!text || text.length > MAX_TEXT) return sendJson(res, 400, { error: 'Mensagem vazia ou longa demais.' });
      const phoneDigits = chat.phoneDigits || (chat.chatJid.endsWith('@s.whatsapp.net') ? normalizePhoneDigits(chat.chatJid) : null);
      if (!phoneDigits) return sendJson(res, 400, { error: 'Este contato não tem número visível. Responda pelo celular.' });
      const channel = await getChannel(supabase);
      if (!channelReady(channel)) return sendJson(res, 503, { error: 'WhatsApp não configurado.' });

      const [result] = await sendMessages(channel, [{ phoneDigits, message: text }]);
      if (!result?.ok) {
        const hint = channel.type === 'official' ? ' Pela API Oficial, texto livre só é entregue a quem escreveu nas últimas 24 horas.' : '';
        return sendJson(res, 502, { error: `${result?.error || 'Falha ao enviar pelo WhatsApp.'}${hint}` });
      }

      await logAgentMessage(supabase, { chatJid: chat.chatJid, phoneDigits, role: 'assistant', source: 'human', content: text });
      // Você assumiu a conversa: o agente fica 12 horas sem responder esse cliente.
      await pauseChat(supabase, { chatJid: chat.chatJid, phoneDigits });
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 400, { error: 'Ação inválida.' });
  } catch (error) {
    console.error('[conversations]', error.message);
    return sendJson(res, 500, { error: 'Não foi possível concluir a ação.' });
  }
}

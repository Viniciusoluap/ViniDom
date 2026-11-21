import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient, sendJson } from '../src/server/supabaseServer.js';
import { normalizePhoneDigits } from '../src/server/agentUtils.js';
import { AUDIO_REPLY, composeAgentInput, ensureClientRegistered, isAudioOnly, runAgent } from './_agent.js';
import { MAX_MEDIA_BYTES, MEDIA_KINDS, mediaLabel, storeMedia } from './_media.js';
import { getAgentSettings, isChatPaused, logAgentMessage, pauseChat, secretMatches } from './_whatsapp.js';
import { downloadYcloudMedia, getYcloudConfig, isYcloudReady, sendYcloudText, verifyYcloudSignature } from './_ycloud.js';

const DEBOUNCE_MS = 4000; // espera o cliente terminar de mandar mensagens picadas
const LOCK_SECONDS = 90;
const PENDING_WINDOW_MS = 30 * 60_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Lê o corpo exatamente como chegou (a assinatura é calculada sobre esses bytes).
export function readRawBody(req) {
  return new Promise((resolve) => {
    if (req.readableEnded || req.destroyed) return resolve(null);
    const chunks = [];
    const timer = setTimeout(() => resolve(null), 1500);
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => { clearTimeout(timer); resolve(chunks.length ? Buffer.concat(chunks) : null); });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

// Mantém a função viva depois da resposta (a YCloud pede retorno em poucos segundos).
function runAfterResponse(promise) {
  const context = globalThis[Symbol.for('@vercel/request-context')]?.get?.();
  if (context?.waitUntil) { context.waitUntil(promise); return null; }
  return promise;
}

const chatJidFor = (phoneDigits, raw) => (phoneDigits ? `55${phoneDigits}@s.whatsapp.net` : `wa:${String(raw || '').replace(/[^\w.+-]/g, '').slice(0, 60)}`);

// Texto e mídia de uma mensagem (recebida ou enviada pelo aplicativo).
export function parseMessage(message) {
  const type = message?.type;
  if (type === 'text') return { text: String(message.text?.body || '').trim() };
  if (type === 'button') return { text: String(message.button?.text || '').trim() };
  if (type === 'interactive') {
    const reply = message.interactive?.button_reply || message.interactive?.list_reply;
    return { text: String(reply?.title || '').trim() };
  }
  const kind = type === 'voice' ? 'audio' : type;
  if (MEDIA_KINDS.includes(kind) && message[type]) {
    const node = message[type];
    return { media: { kind, link: node.link || null, mime: node.mime_type || null, fileName: node.filename || null, caption: String(node.caption || '').trim() } };
  }
  if (type === 'location') return { text: '[localização compartilhada]' };
  if (type === 'contacts') return { text: '[contato compartilhado]' };
  return {};
}

async function insertMessage(supabase, row) {
  const { data, error } = await supabase.from('agent_messages').insert(row).select('id').single();
  if (error) throw new Error(`Falha ao registrar mensagem: ${error.message}`);
  return data.id;
}

async function storeIncoming(supabase, config, { chatJid, phoneDigits, parsed, role, source }) {
  if (parsed.media) {
    const data = await downloadYcloudMedia(config, parsed.media.link, MAX_MEDIA_BYTES);
    const path = await storeMedia(supabase, { kind: parsed.media.kind, mime: parsed.media.mime, data });
    return insertMessage(supabase, {
      chat_jid: chatJid, phone_digits: phoneDigits, role, source,
      content: mediaLabel(parsed.media.kind, { caption: parsed.media.caption.slice(0, 2000), fileName: parsed.media.fileName }),
      media_type: parsed.media.kind, media_path: path, media_mime: parsed.media.mime ? String(parsed.media.mime).slice(0, 100) : null,
    });
  }
  return insertMessage(supabase, { chat_jid: chatJid, phone_digits: phoneDigits, role, source, content: parsed.text.slice(0, 4000) });
}

// Só uma resposta por vez em cada conversa.
async function lockChat(supabase, chatJid) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const now = new Date();
    const { data } = await supabase.from('agent_chats')
      .update({ busy_until: new Date(now.getTime() + LOCK_SECONDS * 1000).toISOString() })
      .eq('chat_jid', chatJid)
      .or(`busy_until.is.null,busy_until.lt.${now.toISOString()}`)
      .select('chat_jid');
    if (data?.length) return true;
    await sleep(2000);
  }
  return false;
}

const unlockChat = (supabase, chatJid) => supabase.from('agent_chats').update({ busy_until: null }).eq('chat_jid', chatJid);

// Mensagens do cliente ainda sem resposta: tudo o que chegou depois da última mensagem do salão.
export function pendingFrom(rows, now = Date.now()) {
  const recent = rows.filter((row) => now - new Date(row.created_at).getTime() <= PENDING_WINDOW_MS);
  const lastReply = recent.reduce((max, row) => (row.role === 'assistant' && row.id > max ? row.id : max), 0);
  const pending = recent.filter((row) => row.role === 'user' && row.id > lastReply).sort((a, b) => a.id - b.id);
  const texts = [];
  const captions = [];
  const media = [];
  for (const row of pending) {
    if (row.media_type) {
      media.push(row.media_type);
      const caption = String(row.content || '').replace(/^\[[^\]]*\]\s?/, '').trim();
      if (caption) captions.push(caption);
    } else {
      texts.push(row.content);
    }
  }
  return { firstId: pending[0]?.id || null, lastId: pending[pending.length - 1]?.id || null, parts: { text: texts.join('\n'), captions, media } };
}

async function answer(supabase, config, { chatJid, phoneDigits, contactName, messageId }) {
  await sleep(DEBOUNCE_MS);
  const settings = await getAgentSettings(supabase);
  if (!settings.enabled || !settings.apiKey || settings.channel !== 'official') return;
  if (await isChatPaused(supabase, { chatJid, phoneDigits })) return;

  const loadRows = async () => {
    const { data } = await supabase.from('agent_messages')
      .select('id, role, content, media_type, created_at').eq('chat_jid', chatJid)
      .order('id', { ascending: false }).limit(40);
    return data || [];
  };
  // Chegou mensagem mais nova: é ela que responde, já com tudo junto.
  if (pendingFrom(await loadRows()).lastId !== messageId) return;
  if (!await lockChat(supabase, chatJid)) return;

  try {
    const pending = pendingFrom(await loadRows());
    if (!pending.firstId || pending.lastId !== messageId) return;

    let reply;
    if (isAudioOnly(pending.parts)) {
      reply = AUDIO_REPLY;
    } else {
      const anthropic = new Anthropic({ apiKey: settings.apiKey, timeout: 40_000, maxRetries: 1 });
      reply = await runAgent({
        anthropic, supabase, chatJid, phoneDigits, pushName: contactName,
        text: composeAgentInput(pending.parts), settings, historyBeforeId: pending.firstId,
      });
    }
    if (!reply) return;
    await sendYcloudText(config, phoneDigits, reply);
    await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'assistant', content: reply });
  } catch (error) {
    console.error('[ycloud] Falha no atendimento:', error?.status || '', error?.message);
  } finally {
    await unlockChat(supabase, chatJid);
  }
}

async function handleInbound(supabase, config, message) {
  const phoneDigits = normalizePhoneDigits(message.from);
  const chatJid = chatJidFor(phoneDigits, message.from);
  const contactName = String(message.customerProfile?.name || '').trim().slice(0, 80);
  const parsed = parseMessage(message);
  if (!parsed.text && !parsed.media) return null;

  await supabase.from('agent_chats').upsert({
    chat_jid: chatJid, phone_digits: phoneDigits, updated_at: new Date().toISOString(), ...(contactName ? { contact_name: contactName } : {}),
  });
  await ensureClientRegistered(supabase, { phoneDigits, pushName: contactName });
  const messageId = await storeIncoming(supabase, config, { chatJid, phoneDigits, parsed, role: 'user', source: 'client' });
  if (!phoneDigits) return null; // sem telefone não há como responder
  return () => answer(supabase, config, { chatJid, phoneDigits, contactName, messageId });
}

// Mensagem enviada pelo aplicativo WhatsApp Business do salão: alguém assumiu a conversa.
async function handleAppEcho(supabase, config, message) {
  const phoneDigits = normalizePhoneDigits(message.to);
  const chatJid = chatJidFor(phoneDigits, message.to);
  const parsed = parseMessage(message);
  await pauseChat(supabase, { chatJid, phoneDigits });
  if (parsed.text || parsed.media) await storeIncoming(supabase, config, { chatJid, phoneDigits, parsed, role: 'assistant', source: 'human' });
}

// Trata um evento já autenticado. Devolve a função que responde ao cliente (roda depois do retorno à YCloud) ou null.
export async function dispatchEvent(supabase, config, event) {
  if (!isYcloudReady(config)) {
    console.error('[ycloud] Evento recebido sem número configurado.');
    return null;
  }
  if (event.type === 'whatsapp.inbound_message.received' && event.whatsappInboundMessage) {
    return handleInbound(supabase, config, event.whatsappInboundMessage);
  }
  if (event.type === 'whatsapp.smb.message.echoes' && event.whatsappMessage) {
    await handleAppEcho(supabase, config, event.whatsappMessage);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }
  const rawBody = await readRawBody(req);
  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor não configurado.' });
  const config = await getYcloudConfig(supabase);
  if (!config?.urlToken || !secretMatches(String(req.query?.k || ''), config.urlToken)) {
    return sendJson(res, 401, { error: 'Não autorizado.' });
  }

  let event;
  if (rawBody) {
    if (config.webhookSecret && !verifyYcloudSignature(rawBody, req.headers['ycloud-signature'], config.webhookSecret)) {
      return sendJson(res, 401, { error: 'Assinatura inválida.' });
    }
    try { event = JSON.parse(rawBody.toString('utf8')); } catch { return sendJson(res, 400, { error: 'JSON inválido.' }); }
  } else {
    event = typeof req.body === 'string' ? JSON.parse(req.body || 'null') : req.body;
  }
  if (!event || typeof event.id !== 'string' || typeof event.type !== 'string') return sendJson(res, 400, { error: 'Evento inválido.' });

  // A YCloud reenvia o mesmo evento quando não recebe resposta a tempo: só o primeiro é processado.
  const { error: duplicate } = await supabase.from('webhook_events').insert({ id: event.id.slice(0, 120), type: event.type.slice(0, 80) });
  if (duplicate) {
    if (duplicate.code === '23505') return sendJson(res, 200, { ok: true, duplicate: true });
    console.error('[ycloud] Falha ao registrar evento:', duplicate.message);
    return sendJson(res, 503, { error: 'Tente novamente.' });
  }

  let later;
  try {
    later = await dispatchEvent(supabase, config, event);
  } catch (error) {
    console.error('[ycloud] Falha ao tratar evento:', event.type, error.message);
    await supabase.from('webhook_events').delete().eq('id', event.id.slice(0, 120));
    return sendJson(res, 503, { error: 'Tente novamente.' });
  }

  sendJson(res, 200, { ok: true });
  if (later) {
    const pending = runAfterResponse(later());
    if (pending) await pending;
  }
  return undefined;
}

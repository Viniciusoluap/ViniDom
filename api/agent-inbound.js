import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient, getBearerToken, parseBody, sendJson } from '../src/server/supabaseServer.js';
import { normalizePhoneDigits } from '../src/server/agentUtils.js';
import { AUDIO_REPLY, composeAgentInput, ensureClientRegistered, isAudioOnly, runAgent } from './_agent.js';
import { MEDIA_KINDS, mediaLabel, storeMedia } from './_media.js';
import {
  getAgentSettings, getWebConfig, isChatPaused, logAgentMessage, pauseChat, secretMatches,
} from './_whatsapp.js';

// Chamado pelo serviço do WhatsApp Web (Railway) a cada mensagem recebida.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor não configurado.' });

  const webConfig = await getWebConfig(supabase);
  if (!webConfig || !secretMatches(getBearerToken(req), webConfig.serviceSecret)) {
    return sendJson(res, 401, { error: 'Não autorizado.' });
  }

  const body = parseBody(req) || {};
  const chatJid = String(body.jid || '').slice(0, 120);
  if (!chatJid) return sendJson(res, 400, { error: 'Conversa inválida.' });
  const phoneDigits = normalizePhoneDigits(body.phone || (chatJid.endsWith('@s.whatsapp.net') ? chatJid : ''));

  // Alguém respondeu manualmente pelo celular: o agente sai da conversa por 12 horas.
  if (body.type === 'human_reply') {
    await pauseChat(supabase, { chatJid, phoneDigits });
    if (body.text) await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'assistant', source: 'human', content: body.text });
    return sendJson(res, 200, { reply: null });
  }

  const contactName = String(body.name || '').trim().slice(0, 80);

  // Foto, áudio, vídeo ou arquivo: guarda para o painel. A Vicky só fica sabendo do tipo, no próximo bloco de texto.
  if (body.type === 'media') {
    const kind = MEDIA_KINDS.includes(body.media?.kind) ? body.media.kind : 'document';
    const path = await storeMedia(supabase, { kind, mime: body.media?.mime, data: body.media?.data });
    const content = mediaLabel(kind, { caption: String(body.caption || '').slice(0, 2000), fileName: body.media?.fileName });
    const media = { type: kind, path, mime: body.media?.mime ? String(body.media.mime).slice(0, 100) : null };
    if (body.fromMe) {
      await pauseChat(supabase, { chatJid, phoneDigits });
      await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'assistant', source: 'human', content, media });
    } else {
      if (contactName) {
        await supabase.from('agent_chats').upsert({ chat_jid: chatJid, phone_digits: phoneDigits, contact_name: contactName, updated_at: new Date().toISOString() });
      }
      await ensureClientRegistered(supabase, { phoneDigits, pushName: contactName });
      await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'user', content, media });
    }
    return sendJson(res, 200, { reply: null });
  }

  const text = String(body.text || '').trim().slice(0, 2000);
  const parts = {
    text,
    captions: (Array.isArray(body.captions) ? body.captions : []).map((c) => String(c || '').slice(0, 2000)),
    media: (Array.isArray(body.media) ? body.media : []).filter((kind) => MEDIA_KINDS.includes(kind)),
  };
  const agentInput = composeAgentInput(parts);
  if (!agentInput) return sendJson(res, 200, { reply: null });

  if (contactName) {
    await supabase.from('agent_chats').upsert({ chat_jid: chatJid, phone_digits: phoneDigits, contact_name: contactName, updated_at: new Date().toISOString() });
  }

  // Todo número que conversa com a Vicky entra no cadastro de clientes.
  await ensureClientRegistered(supabase, { phoneDigits, pushName: contactName });

  const settings = await getAgentSettings(supabase);
  const paused = await isChatPaused(supabase, { chatJid, phoneDigits });
  if (!settings.enabled || !settings.apiKey || paused) {
    await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'user', content: text });
    return sendJson(res, 200, { reply: null });
  }

  // Só áudio: a resposta é fixa e não passa pelo modelo.
  if (isAudioOnly(parts)) {
    await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'assistant', content: AUDIO_REPLY });
    return sendJson(res, 200, { reply: AUDIO_REPLY });
  }

  let reply;
  try {
    const anthropic = new Anthropic({ apiKey: settings.apiKey, timeout: 45_000, maxRetries: 1 });
    reply = await runAgent({ anthropic, supabase, chatJid, phoneDigits, pushName: contactName, text: agentInput, settings });
  } catch (error) {
    console.error('[agent] Falha no atendimento:', error?.status || '', error?.message);
    await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'user', content: text });
    return sendJson(res, 200, { reply: null, error: 'agent_failed' });
  }

  await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'user', content: text });
  if (reply) await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'assistant', content: reply });
  return sendJson(res, 200, { reply });
}

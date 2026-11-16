import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient, getBearerToken, parseBody, sendJson } from '../src/server/supabaseServer.js';
import { normalizePhoneDigits } from '../src/server/agentUtils.js';
import { runAgent } from './_agent.js';
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

  const text = String(body.text || '').trim().slice(0, 2000);
  if (!text) return sendJson(res, 200, { reply: null });

  const contactName = String(body.name || '').trim().slice(0, 80);
  if (contactName) {
    await supabase.from('agent_chats').upsert({ chat_jid: chatJid, phone_digits: phoneDigits, contact_name: contactName, updated_at: new Date().toISOString() });
  }

  const settings = await getAgentSettings(supabase);
  const paused = await isChatPaused(supabase, { chatJid, phoneDigits });
  if (!settings.enabled || !settings.apiKey || paused) {
    await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'user', content: text });
    return sendJson(res, 200, { reply: null });
  }

  let reply;
  try {
    const anthropic = new Anthropic({ apiKey: settings.apiKey, timeout: 45_000, maxRetries: 1 });
    reply = await runAgent({ anthropic, supabase, chatJid, phoneDigits, pushName: String(body.name || '').slice(0, 80), text });
  } catch (error) {
    console.error('[agent] Falha no atendimento:', error?.status || '', error?.message);
    await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'user', content: text });
    return sendJson(res, 200, { reply: null, error: 'agent_failed' });
  }

  await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'user', content: text });
  if (reply) await logAgentMessage(supabase, { chatJid, phoneDigits, role: 'assistant', content: reply });
  return sendJson(res, 200, { reply });
}

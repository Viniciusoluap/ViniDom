import crypto from 'node:crypto';

export const AGENT_DEFAULTS = { enabled: true, followups: true };

export async function readSetting(supabase, key) {
  const { data } = await supabase.from('integration_settings').select('value').eq('key', key).maybeSingle();
  return data?.value || null;
}

export async function getAgentSettings(supabase) {
  const stored = (await readSetting(supabase, 'agent')) || {};
  return {
    enabled: stored.enabled ?? AGENT_DEFAULTS.enabled,
    followups: stored.followups ?? AGENT_DEFAULTS.followups,
    apiKey: process.env.ANTHROPIC_API_KEY || stored.apiKey || '',
  };
}

export async function getWebConfig(supabase) {
  const config = await readSetting(supabase, 'whatsapp_web');
  return config?.serviceUrl && config?.serviceSecret ? config : null;
}

export function secretMatches(provided, expected) {
  const a = Buffer.from(String(provided || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Envia mensagens pelo serviço do WhatsApp Web (Railway). recipients: [{ phone, message, name }]
export async function sendViaService(config, recipients) {
  const response = await fetch(`${config.serviceUrl}/send-bulk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.serviceSecret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipients }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Serviço do WhatsApp respondeu ${response.status}.`);
  return data.results || [];
}

export async function logAgentMessage(supabase, { chatJid, phoneDigits, role, content, source }) {
  const text = String(content || '').trim();
  if (!text) return;
  const { error } = await supabase.from('agent_messages').insert({
    chat_jid: chatJid || `55${phoneDigits}@s.whatsapp.net`,
    phone_digits: phoneDigits || null,
    role,
    source: source || (role === 'user' ? 'client' : 'agent'),
    content: text.slice(0, 4000),
  });
  if (error) console.error('[agent] Falha ao registrar mensagem:', error.message);
}

export async function pauseChat(supabase, { chatJid, phoneDigits, hours = 12 }) {
  const pausedUntil = new Date(Date.now() + hours * 3600_000).toISOString();
  await supabase.from('agent_chats').upsert({
    chat_jid: chatJid || `55${phoneDigits}@s.whatsapp.net`,
    phone_digits: phoneDigits || null,
    paused_until: pausedUntil,
    updated_at: new Date().toISOString(),
  });
}

export async function isChatPaused(supabase, { chatJid, phoneDigits }) {
  const filters = [`chat_jid.eq."${String(chatJid || '').replace(/"/g, '')}"`];
  if (phoneDigits) filters.push(`phone_digits.eq.${phoneDigits}`);
  const { data } = await supabase.from('agent_chats').select('paused_until').or(filters.join(','));
  const now = Date.now();
  return (data || []).some((row) => row.paused_until && new Date(row.paused_until).getTime() > now);
}

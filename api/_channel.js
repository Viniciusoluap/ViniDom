import { getAgentSettings, getWebConfig, sendViaService } from './_whatsapp.js';
import { getYcloudConfig, isYcloudReady, sendYcloudTemplate, sendYcloudText } from './_ycloud.js';

// Por onde a Vicky fala: API Oficial (YCloud) quando escolhida e configurada; senão, WhatsApp Web (Railway).
export async function getChannel(supabase, settings = null) {
  const agent = settings || await getAgentSettings(supabase);
  if (agent.channel === 'official') {
    const config = await getYcloudConfig(supabase);
    if (isYcloudReady(config)) return { type: 'official', config };
  }
  return { type: 'web', config: await getWebConfig(supabase) };
}

export const channelReady = (channel) => Boolean(channel?.config);

// items: [{ phoneDigits, message, name?, template?: { kind, values } }] → [{ ok, error }], na mesma ordem.
// Na API Oficial, `template` é usado para mensagens que o salão inicia; sem ele vai texto livre,
// que a Meta só entrega para quem escreveu nas últimas 24 horas.
export async function sendMessages(channel, items) {
  if (!channelReady(channel)) throw new Error('WhatsApp não configurado.');
  if (channel.type === 'web') {
    const results = await sendViaService(channel.config, items.map((item) => ({ phone: item.phoneDigits, message: item.message, name: item.name || '' })));
    return items.map((_, index) => ({ ok: Boolean(results[index]?.ok), error: results[index]?.error || null }));
  }
  const results = [];
  for (const item of items) {
    try {
      if (item.template) await sendYcloudTemplate(channel.config, item.phoneDigits, item.template.kind, item.template.values);
      else await sendYcloudText(channel.config, item.phoneDigits, item.message);
      results.push({ ok: true, error: null });
    } catch (error) {
      console.error('[ycloud] Falha ao enviar:', error.code || error.status || '', error.message);
      results.push({ ok: false, error: error.message });
    }
  }
  return results;
}

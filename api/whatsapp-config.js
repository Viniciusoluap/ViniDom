import { getAdminClient, requireAdmin, sendJson, parseBody } from '../src/server/supabaseServer.js';
import crypto from 'node:crypto';
import { AGENT_DEFAULTS } from './_whatsapp.js';
import { ensureYcloudTemplates, getYcloudConfig, isYcloudReady, listYcloudPhones, listYcloudTemplates } from './_ycloud.js';

const SITE_URL = 'https://vcvisagismo.com';
const webhookUrlFor = (urlToken) => (urlToken ? `${SITE_URL}/api/ycloud-webhook?k=${urlToken}` : '');

function maskToken(value) {
  const str = String(value || '');
  if (str.length <= 6) return str ? '••••' : '';
  return `${str.slice(0, 4)}••••${str.slice(-4)}`;
}

async function readSetting(supabase, key) {
  const { data } = await supabase.from('integration_settings').select('value').eq('key', key).maybeSingle();
  return data?.value || null;
}

async function writeSetting(supabase, key, value) {
  await supabase.from('integration_settings').upsert({ key, value, updated_at: new Date().toISOString() });
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  const auth = await requireAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { error: auth.error });

  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor não configurado.' });

  if (req.method === 'GET') {
    const official = await readSetting(supabase, 'whatsapp_official');
    const web = await readSetting(supabase, 'whatsapp_web');
    const agent = (await readSetting(supabase, 'agent')) || {};
    const ycloud = await readSetting(supabase, 'whatsapp_ycloud');
    const apiKey = process.env.ANTHROPIC_API_KEY || agent.apiKey || '';
    return sendJson(res, 200, {
      agent: {
        enabled: agent.enabled ?? true,
        followups: agent.followups ?? true,
        channel: agent.channel === 'official' ? 'official' : 'web',
        ownerPhone: agent.ownerPhone || AGENT_DEFAULTS.ownerPhone,
        address: agent.address || '',
        mapsUrl: agent.mapsUrl || '',
        hasApiKey: Boolean(apiKey),
        apiKeyPreview: maskToken(apiKey),
      },
      ycloud: {
        configured: Boolean(ycloud?.apiKey),
        ready: isYcloudReady(ycloud),
        apiKeyPreview: maskToken(ycloud?.apiKey),
        hasWebhookSecret: Boolean(ycloud?.webhookSecret),
        phoneNumber: ycloud?.phoneNumber || '',
        webhookUrl: webhookUrlFor(ycloud?.urlToken),
      },
      official: {
        configured: Boolean(official?.accessToken && official?.phoneNumberId),
        phoneNumberId: official?.phoneNumberId || '',
        accessTokenPreview: maskToken(official?.accessToken),
        apiVersion: official?.apiVersion || 'v18.0',
      },
      web: {
        configured: Boolean(web?.serviceUrl && web?.serviceSecret),
        serviceUrl: web?.serviceUrl || '',
        serviceSecretPreview: maskToken(web?.serviceSecret),
      },
    });
  }

  const body = parseBody(req);
  const channel = String(body?.channel || '');

  if (req.method === 'DELETE') {
    if (!['official', 'web', 'ycloud'].includes(channel)) return sendJson(res, 400, { error: 'Canal inválido.' });
    await supabase.from('integration_settings').delete().eq('key', `whatsapp_${channel}`);
    if (channel === 'ycloud') {
      // Sem a API Oficial, a Vicky volta a falar pelo WhatsApp Web.
      const agent = (await readSetting(supabase, 'agent')) || {};
      if (agent.channel === 'official') await writeSetting(supabase, 'agent', { ...agent, channel: 'web' });
    }
    return sendJson(res, 200, { ok: true });
  }

  if (channel === 'official') {
    const accessToken = String(body?.accessToken || '').trim();
    const phoneNumberId = String(body?.phoneNumberId || '').trim();
    const apiVersion = String(body?.apiVersion || 'v18.0').trim();
    if (!accessToken || !phoneNumberId) return sendJson(res, 400, { error: 'Informe o token e o Phone Number ID.' });
    await writeSetting(supabase, 'whatsapp_official', { accessToken, phoneNumberId, apiVersion });
    return sendJson(res, 200, { ok: true });
  }

  if (channel === 'agent') {
    const current = (await readSetting(supabase, 'agent')) || {};
    const next = { ...current };
    if (typeof body?.enabled === 'boolean') next.enabled = body.enabled;
    if (typeof body?.followups === 'boolean') next.followups = body.followups;
    if (body?.ownerPhone !== undefined) {
      const digits = String(body.ownerPhone || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
      if (!/^\d{10,11}$/.test(digits)) return sendJson(res, 400, { error: 'WhatsApp para avisos inválido. Use DDD + número.' });
      next.ownerPhone = digits;
    }
    if (body?.agentChannel !== undefined) {
      if (!['web', 'official'].includes(body.agentChannel)) return sendJson(res, 400, { error: 'Canal de atendimento inválido.' });
      if (body.agentChannel === 'official' && !isYcloudReady(await getYcloudConfig(supabase))) {
        return sendJson(res, 400, { error: 'Conecte a API Oficial (YCloud) e o número antes de mudar o atendimento para ela.' });
      }
      next.channel = body.agentChannel;
    }
    if (body?.address !== undefined) next.address = String(body.address || '').trim().slice(0, 200);
    if (body?.mapsUrl !== undefined) {
      const mapsUrl = String(body.mapsUrl || '').trim();
      if (mapsUrl && !/^https:\/\/[^\s]{8,500}$/.test(mapsUrl)) return sendJson(res, 400, { error: 'Link do mapa inválido. Cole o link que começa com https://' });
      next.mapsUrl = mapsUrl;
    }
    if (body?.apiKey !== undefined) {
      const apiKey = String(body.apiKey || '').trim();
      if (apiKey && !/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(apiKey)) return sendJson(res, 400, { error: 'Chave da API do Claude inválida.' });
      next.apiKey = apiKey;
    }
    await writeSetting(supabase, 'agent', next);
    return sendJson(res, 200, { ok: true });
  }

  if (channel === 'ycloud') {
    const current = (await readSetting(supabase, 'whatsapp_ycloud')) || {};
    const action = String(body?.action || 'save');
    try {
      if (action === 'save') {
        const next = { ...current };
        if (body?.apiKey !== undefined) {
          const key = String(body.apiKey || '').trim();
          if (key.length < 16 || /\s/.test(key)) return sendJson(res, 400, { error: 'Chave da YCloud inválida.' });
          next.apiKey = key;
        }
        if (body?.webhookSecret !== undefined) next.webhookSecret = String(body.webhookSecret || '').trim().slice(0, 200);
        if (!next.apiKey) return sendJson(res, 400, { error: 'Informe a chave da API da YCloud.' });
        if (!next.urlToken) next.urlToken = crypto.randomBytes(24).toString('hex');
        // Confere a chave e descobre o número conectado (com um só número, ele é escolhido sozinho).
        const phones = await listYcloudPhones(next);
        const wanted = String(body?.phoneNumber || next.phoneNumber || '');
        const chosen = phones.find((phone) => phone.phoneNumber === wanted) || (phones.length === 1 ? phones[0] : null);
        next.phoneNumber = chosen?.phoneNumber || '';
        next.wabaId = chosen?.wabaId || '';
        await writeSetting(supabase, 'whatsapp_ycloud', next);
        return sendJson(res, 200, { ok: true, phones, phoneNumber: next.phoneNumber, webhookUrl: webhookUrlFor(next.urlToken) });
      }
      const config = await getYcloudConfig(supabase);
      if (!config) return sendJson(res, 400, { error: 'Salve a chave da YCloud primeiro.' });
      if (action === 'status') {
        const phones = await listYcloudPhones(config);
        return sendJson(res, 200, { phones, templates: await listYcloudTemplates(config) });
      }
      if (action === 'templates') {
        const created = await ensureYcloudTemplates(config);
        return sendJson(res, 200, { created, templates: await listYcloudTemplates(config) });
      }
      return sendJson(res, 400, { error: 'Ação inválida.' });
    } catch (error) {
      const hint = error.status === 401 ? 'A YCloud recusou a chave da API. Confira se copiou a chave inteira.' : error.message;
      return sendJson(res, 502, { error: hint || 'Não foi possível falar com a YCloud.' });
    }
  }

  if (channel === 'web') {
    const serviceUrl = String(body?.serviceUrl || '').trim().replace(/\/+$/, '');
    const serviceSecret = String(body?.serviceSecret || '').trim();
    if (!/^https:\/\/.+/.test(serviceUrl) || !serviceSecret) {
      return sendJson(res, 400, { error: 'Informe a URL (https) e o segredo do serviço.' });
    }
    await writeSetting(supabase, 'whatsapp_web', { serviceUrl, serviceSecret });
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 400, { error: 'Canal inválido.' });
}

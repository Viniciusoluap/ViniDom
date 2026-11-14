import { getAdminClient, requireAdmin, sendJson, parseBody } from '../src/server/supabaseServer.js';

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
    return sendJson(res, 200, {
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
    if (!['official', 'web'].includes(channel)) return sendJson(res, 400, { error: 'Canal inválido.' });
    await supabase.from('integration_settings').delete().eq('key', `whatsapp_${channel}`);
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

import { getAdminClient, requireAdmin, sendJson, parseBody } from '../src/server/supabaseServer.js';

const MAX_RECIPIENTS = 50;
const MAX_MESSAGE_LENGTH = 4096;

async function getWebConfig(supabase) {
  const { data } = await supabase.from('integration_settings').select('value').eq('key', 'whatsapp_web').maybeSingle();
  return data?.value || null;
}

async function callService(config, path, options = {}) {
  const response = await fetch(`${config.serviceUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.serviceSecret}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
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

  const config = await getWebConfig(supabase);
  const configured = Boolean(config?.serviceUrl && config?.serviceSecret);

  if (req.method === 'GET') {
    const action = String(req.query?.action || 'status');
    if (!configured) return sendJson(res, 200, { configured: false, status: 'not_configured' });

    if (action === 'qr') {
      const result = await callService(config, '/qr').catch(() => null);
      if (!result || !result.ok) return sendJson(res, 200, { configured: true, qr: null });
      return sendJson(res, 200, { configured: true, qr: result.data.qrDataUrl || null });
    }

    const result = await callService(config, '/status').catch(() => null);
    if (!result || !result.ok) return sendJson(res, 200, { configured: true, status: 'unreachable' });
    return sendJson(res, 200, { configured: true, status: result.data.status || 'unknown', phone: result.data.phone || null });
  }

  if (!configured) return sendJson(res, 503, { error: 'WhatsApp Web não configurado no servidor.' });

  const body = parseBody(req);
  const action = String(body?.action || '');

  if (action === 'disconnect') {
    const result = await callService(config, '/disconnect', { method: 'POST' }).catch(() => null);
    return sendJson(res, result?.ok ? 200 : 502, { ok: Boolean(result?.ok) });
  }

  if (action === 'send') {
    const recipients = Array.isArray(body?.recipients) ? body.recipients : [];
    if (recipients.length === 0 || recipients.length > MAX_RECIPIENTS) {
      return sendJson(res, 400, { error: `Envie entre 1 e ${MAX_RECIPIENTS} destinatários.` });
    }
    const invalid = recipients.find((recipient) => {
      const digits = String(recipient?.phone || '').replace(/\D/g, '');
      const message = String(recipient?.message || '').trim();
      return digits.length < 8 || digits.length > 15 || message.length === 0 || message.length > MAX_MESSAGE_LENGTH;
    });
    if (invalid) return sendJson(res, 400, { error: 'Destinatário ou mensagem inválidos.' });

    const result = await callService(config, '/send-bulk', {
      method: 'POST',
      body: JSON.stringify({ recipients }),
    }).catch(() => null);

    if (!result || !result.ok) return sendJson(res, 502, { error: 'Falha ao comunicar com o serviço do WhatsApp Web.' });
    return sendJson(res, 200, { results: result.data.results || [] });
  }

  return sendJson(res, 400, { error: 'Ação inválida.' });
}

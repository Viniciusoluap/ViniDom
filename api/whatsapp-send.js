import { createClient } from '@supabase/supabase-js';

const MAX_RECIPIENTS = 50;
const MAX_MESSAGE_LENGTH = 4096;

function getEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function getBearerToken(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

function getAdminClient() {
  const url = getEnv('SUPABASE_URL', getEnv('VITE_SUPABASE_URL'));
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAdmin(req) {
  const supabase = getAdminClient();
  const token = getBearerToken(req);
  if (!supabase || !token) return { error: 'Não autorizado.', status: 401 };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user || data.user.app_metadata?.role !== 'admin') {
    return { error: 'Não autorizado.', status: 403 };
  }
  return { user: data.user };
}

function sendJson(res, status, payload) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(payload);
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  const auth = await requireAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { error: auth.error });

  const accessToken = getEnv('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = getEnv('WHATSAPP_PHONE_NUMBER_ID');
  const apiVersion = getEnv('WHATSAPP_API_VERSION', 'v18.0');
  const configured = Boolean(accessToken && phoneNumberId);

  if (req.method === 'GET') {
    return sendJson(res, configured ? 200 : 503, {
      configured,
      message: configured ? 'WhatsApp Business API configurada no servidor.' : 'Configure as variáveis privadas do WhatsApp no Vercel.',
    });
  }

  if (!configured) return sendJson(res, 503, { error: 'WhatsApp Business API não configurada no servidor.' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return sendJson(res, 400, { error: 'JSON inválido.' }); }
  }

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

  const results = [];
  for (const recipient of recipients) {
    const digits = String(recipient.phone).replace(/\D/g, '');
    try {
      const response = await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: `55${digits}`,
          type: 'text',
          text: { body: String(recipient.message).trim() },
        }),
      });
      const data = await response.json().catch(() => ({}));
      results.push({
        name: String(recipient.name || ''),
        phone: String(recipient.phone || ''),
        ok: response.ok,
        error: response.ok ? null : (data.error?.message || 'Erro retornado pela API WhatsApp.'),
      });
    } catch {
      results.push({
        name: String(recipient.name || ''),
        phone: String(recipient.phone || ''),
        ok: false,
        error: 'Falha de comunicação com a API WhatsApp.',
      });
    }
  }

  return sendJson(res, 200, { results });
}

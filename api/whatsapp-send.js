import { getAdminClient, requireAdmin, sendJson } from '../src/server/supabaseServer.js';

const MAX_RECIPIENTS = 50;
const MAX_MESSAGE_LENGTH = 4096;

async function getOfficialCredentials(supabase) {
  const { data } = await supabase.from('integration_settings').select('value').eq('key', 'whatsapp_official').maybeSingle();
  return data?.value || null;
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

  const credentials = await getOfficialCredentials(supabase);
  const accessToken = credentials?.accessToken || '';
  const phoneNumberId = credentials?.phoneNumberId || '';
  const apiVersion = credentials?.apiVersion || 'v18.0';
  const configured = Boolean(accessToken && phoneNumberId);

  if (req.method === 'GET') {
    return sendJson(res, configured ? 200 : 503, {
      configured,
      message: configured ? 'WhatsApp Business API configurada.' : 'Configure a API oficial do WhatsApp no painel.',
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

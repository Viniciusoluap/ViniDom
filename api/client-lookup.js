import { getAdminClient, sendJson } from '../src/server/supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }
  res.setHeader('Cache-Control', 'private, no-store');
  const phone = String(req.query?.phone || '').replace(/\D/g, '');
  if (!/^[0-9]{10,11}$/.test(phone)) return sendJson(res, 400, { error: 'WhatsApp inválido.' });
  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Cadastro indisponível.' });
  const { data, error } = await supabase.from('clients').select('name').eq('phone_digits', phone).maybeSingle();
  if (error) return sendJson(res, 503, { error: 'Cadastro indisponível.' });
  return sendJson(res, 200, { name: data?.name || null });
}

import { getAdminClient, sendJson } from '../src/server/supabaseServer.js';
import { addDaysToKey, localNow } from '../src/server/agentUtils.js';
import { planFollowups, QUIET_HOURS } from './_followups.js';
import { getAgentSettings, getWebConfig, logAgentMessage, secretMatches, sendViaService } from './_whatsapp.js';

function authorized(req) {
  const header = req.headers.authorization || '';
  return secretMatches(header.startsWith('Bearer ') ? header.slice(7) : '', process.env.CRON_SECRET);
}

// Roda de hora em hora (vercel.json): confirmações, parabéns, pós-atendimento e convite de retorno.
export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }
  if (!authorized(req)) return sendJson(res, 401, { error: 'Não autorizado.' });

  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor não configurado.' });
  const settings = await getAgentSettings(supabase);
  const webConfig = await getWebConfig(supabase);
  if (!settings.followups || !webConfig) return sendJson(res, 200, { skipped: true });

  const today = localNow().dateKey;
  const [bookingsResult, clientsResult, logResult] = await Promise.all([
    supabase.from('bookings')
      .select('id, date_key, time_slot, services, client_name, client_phone, client_confirmed_at, created_at')
      .neq('status', 'cancelled')
      .gte('date_key', addDaysToKey(today, -60))
      .lte('date_key', addDaysToKey(today, 1))
      .limit(2000),
    supabase.from('clients').select('phone_digits, name, birthdate').not('birthdate', 'is', null).limit(5000),
    supabase.from('agent_outbound_log').select('kind, ref, phone_digits, sent_at')
      .gte('sent_at', new Date(Date.now() - 400 * 86400_000).toISOString()).limit(10000),
  ]);
  if (bookingsResult.error || clientsResult.error || logResult.error) {
    return sendJson(res, 500, { error: 'Falha ao carregar dados.' });
  }

  const quietSince = Date.now() - QUIET_HOURS * 3600_000;
  const logRows = logResult.data || [];
  const plan = planFollowups({
    bookings: bookingsResult.data || [],
    clients: clientsResult.data || [],
    sentRefs: new Set(logRows.map((row) => `${row.kind}:${row.ref}`)),
    recentPhones: new Set(logRows.filter((row) => new Date(row.sent_at).getTime() > quietSince).map((row) => row.phone_digits)),
  });
  if (!plan.length) return sendJson(res, 200, { sent: 0 });

  // Reserva cada envio antes de mandar: uma segunda execução simultânea não repete a mensagem.
  const { data: claimed, error: claimError } = await supabase.from('agent_outbound_log')
    .upsert(plan.map((item) => ({ kind: item.kind, ref: item.ref, phone_digits: item.phoneDigits })),
      { onConflict: 'kind,ref', ignoreDuplicates: true })
    .select('kind, ref');
  if (claimError) return sendJson(res, 500, { error: 'Falha ao reservar envios.' });
  const claimedKeys = new Set((claimed || []).map((row) => `${row.kind}:${row.ref}`));
  const toSend = plan.filter((item) => claimedKeys.has(`${item.kind}:${item.ref}`));
  if (!toSend.length) return sendJson(res, 200, { sent: 0 });

  let results = [];
  try {
    results = await sendViaService(webConfig, toSend.map((item) => ({ phone: item.phoneDigits, message: item.message })));
  } catch (error) {
    console.error('[agent-cron] Serviço do WhatsApp indisponível:', error.message);
  }

  let sent = 0;
  for (const [index, item] of toSend.entries()) {
    if (results[index]?.ok) {
      sent += 1;
      await logAgentMessage(supabase, { phoneDigits: item.phoneDigits, role: 'assistant', content: item.message });
    } else {
      // Libera para tentar de novo na próxima hora.
      await supabase.from('agent_outbound_log').delete().eq('kind', item.kind).eq('ref', item.ref);
    }
  }
  return sendJson(res, 200, { planned: plan.length, sent });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { addDaysToKey, isOpenDay, localNow, normalizePhoneDigits } from '../src/server/agentUtils.js';
import { planFollowups } from '../api/_followups.js';
import { PROFILE_NAME_NOTE, buildContext, ensureClientRegistered, executeTool, freeSlots, runAgent, saveClientName, toWhatsAppFormat } from '../api/_agent.js';
import { SERVICES } from '../src/utils/constants.js';

// Meio-dia de Fortaleza (15:00 UTC) de um dia fixo.
const NOW = Date.parse('2026-11-19T15:00:00Z');
const TODAY = localNow(NOW).dateKey;

function nextOpenDay(fromKey) {
  let key = addDaysToKey(fromKey, 1);
  while (!isOpenDay(key)) key = addDaysToKey(key, 1);
  return key;
}

// Supabase falso: cada tabela devolve sempre as linhas configuradas; escritas ficam registradas.
function fakeSupabase(tables = {}) {
  const writes = [];
  const from = (table) => {
    const rows = tables[table] || [];
    const builder = {
      select: () => builder, eq: () => builder, neq: () => builder, gte: () => builder, lte: () => builder,
      ilike: () => builder, order: () => builder, limit: () => builder, or: () => builder, not: () => builder,
      maybeSingle: async () => ({ data: rows[0] || null, error: null }),
      insert: async (value) => { writes.push({ table, op: 'insert', value }); return { error: null }; },
      upsert: async (value) => { writes.push({ table, op: 'upsert', value }); return { error: null }; },
      update: (value) => { writes.push({ table, op: 'update', value }); return builder; },
      then: (resolve) => resolve({ data: rows, error: null }),
    };
    return builder;
  };
  return { from, writes };
}

test('normaliza telefone do WhatsApp para DDD + 9 dígitos', () => {
  assert.equal(normalizePhoneDigits('5599981392210@s.whatsapp.net'), '99981392210');
  assert.equal(normalizePhoneDigits('559981392210@s.whatsapp.net'), '99981392210');
  assert.equal(normalizePhoneDigits('(99) 98139-2210'), '99981392210');
  assert.equal(normalizePhoneDigits('+55 99 98462-6896'), '99984626896');
  assert.equal(normalizePhoneDigits('123'), null);
});

test('horários livres respeitam reservas, almoço e bloqueio de 120 min do Bumper', async () => {
  const day = nextOpenDay(TODAY);
  const supabase = fakeSupabase({ bookings: [{ time_slot: 600, total_duration: 30, operational_duration: 30 }] });
  const corte = SERVICES.filter((s) => s.id === 1);
  const { slots } = await freeSlots(supabase, day, corte, NOW);
  assert.ok(!slots.includes(600) && !slots.includes(615), '10:00 e 10:15 ocupados pela reserva');
  assert.ok(slots.includes(630));
  assert.ok(!slots.some((slot) => slot > 690 && slot < 840), 'nada durante o almoço');

  const bumper = SERVICES.filter((s) => s.name === 'Bumper');
  const longSlots = (await freeSlots(fakeSupabase(), day, bumper, NOW)).slots;
  assert.ok(longSlots.includes(600), '10:00 + 120 min termina exatamente às 12:00');
  assert.ok(!longSlots.includes(615), '10:15 + 120 min invadiria o almoço');
  assert.equal(longSlots.at(-1), 960, 'último início às 16:00');
});

test('não oferece dia fechado nem horário passado', async () => {
  let closed = TODAY;
  while (isOpenDay(closed)) closed = addDaysToKey(closed, 1);
  assert.equal((await freeSlots(fakeSupabase(), closed, SERVICES.slice(0, 1), NOW)).closed, true);
  assert.match((await freeSlots(fakeSupabase(), addDaysToKey(TODAY, -1), SERVICES.slice(0, 1), NOW)).error, /passou/);
});

test('agendar recusa horário fora da lista livre sem criar reserva', async () => {
  const supabase = fakeSupabase();
  const day = nextOpenDay(TODAY);
  const result = await executeTool('agendar', { data: day, horario: '12:30', servicos: [1], nome: 'João Silva' },
    { supabase, phoneDigits: '99981392210', now: NOW });
  assert.match(result, /não está livre/);
  assert.equal(supabase.writes.length, 0);
});

test('cancelar só aceita reserva do próprio cliente', async () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const supabase = fakeSupabase({ bookings: [{ id, client_phone: '(99) 91111-2222', status: 'confirmed', date_key: TODAY, time_slot: 600, services: [] }] });
  const result = await executeTool('cancelar', { agendamento_id: id }, { supabase, phoneDigits: '99981392210', now: NOW });
  assert.match(result, /não encontrado/);
  assert.equal(supabase.writes.length, 0);
});

test('acompanhamentos: confirmação na véspera, aniversário, pós-atendimento e retorno', () => {
  const tomorrow = addDaysToKey(TODAY, 1);
  const bookings = [
    { id: 'b1', date_key: tomorrow, time_slot: 900, services: [{ name: 'Corte Masculino' }], client_name: 'JOÃO SILVA', client_phone: '(99) 98139-2210', created_at: '2026-11-01T10:00:00Z' },
    { id: 'b2', date_key: addDaysToKey(TODAY, -1), time_slot: 600, services: [], client_name: 'Maria', client_phone: '(99) 98222-3333' },
    { id: 'b3', date_key: addDaysToKey(TODAY, -25), time_slot: 600, services: [], client_name: 'Pedro', client_phone: '(99) 98444-5555' },
    { id: 'b4', date_key: addDaysToKey(TODAY, -90), time_slot: 600, services: [], client_name: 'Antigo', client_phone: '(99) 98666-7777' },
  ];
  const local = localNow(NOW);
  const birthdate = `1990-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
  const clients = [{ phone_digits: '99988887777', name: 'Ana Souza', birthdate }];

  const plan = planFollowups({ bookings, clients, now: NOW });
  const kinds = Object.fromEntries(plan.map((item) => [item.kind, item]));
  assert.deepEqual(plan.map((item) => item.kind), ['confirmacao', 'aniversario', 'pos_atendimento', 'retorno']);
  assert.equal(kinds.confirmacao.message, `Oi, João! Amanhã (${tomorrow.slice(8, 10)}/${tomorrow.slice(5, 7)}) às 15:00, Corte Masculino. Confirma? SIM ou NÃO`);
  assert.match(kinds.aniversario.message, /Feliz aniversário, Ana!/);
  assert.match(kinds.retorno.message, /25 dias/);
  assert.ok(!plan.some((item) => item.phoneDigits === '99986667777'), 'não chama cliente sumido há 90 dias');
  const ownerBooking = { ...bookings[2], id: 'b5', client_phone: '(99) 98462-6896' };
  assert.ok(!planFollowups({ bookings: [ownerBooking], now: NOW }).length, 'nunca envia para o número do próprio salão');

  const sentRefs = new Set(plan.map((item) => `${item.kind}:${item.ref}`));
  assert.equal(planFollowups({ bookings, clients, sentRefs, now: NOW }).length, 0, 'nunca repete o mesmo envio');
  const recentPhones = new Set(['99982223333']);
  assert.ok(!planFollowups({ bookings, clients, recentPhones, now: NOW }).some((item) => item.kind === 'pos_atendimento'));
  assert.equal(planFollowups({ bookings, clients, now: Date.parse('2026-11-19T07:00:00Z') }).length, 0, 'não manda de madrugada');
});

test('loop do agente chama a ferramenta e devolve resposta curta formatada', async () => {
  const day = nextOpenDay(TODAY);
  const calls = [];
  const responses = [
    { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'ver_horarios', input: { data: day, servicos: [1] } }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Tenho **10:00**, 10:30 ou 11:00. Qual prefere?' }] },
  ];
  const anthropic = { messages: { create: async (params) => { calls.push(structuredClone(params)); return responses.shift(); } } };
  const supabase = fakeSupabase({ clients: [{ name: 'João Silva' }] });

  const reply = await runAgent({ anthropic, supabase, chatJid: '5599981392210@s.whatsapp.net', phoneDigits: '99981392210', text: 'Quero cortar amanhã', now: NOW });

  assert.equal(reply, 'Tenho *10:00*, 10:30 ou 11:00. Qual prefere?');
  assert.equal(calls[0].model, 'claude-haiku-5-5');
  assert.equal(calls[0].fallbacks, undefined, 'Haiku 5.5 não tem fallback de servidor');
  assert.deepEqual(calls[0].output_config, { effort: 'medium' });
  assert.match(calls[0].messages.at(-1).content, /João Silva \(cadastrado\)[\s\S]*Quero cortar amanhã/);
  const toolResult = calls[1].messages.at(-1).content[0];
  assert.equal(toolResult.tool_use_id, 't1');
  assert.match(toolResult.content, /Livres em .*10:00/);
});

test('formata negrito para o padrão do WhatsApp', () => {
  assert.equal(toWhatsAppFormat('## Oi\n**ok**'), 'Oi\n*ok*');
});

test('cadastra automaticamente quem conversa, usando o nome do perfil marcado para confirmar', async () => {
  const supabase = fakeSupabase({ clients: [] });
  await ensureClientRegistered(supabase, { phoneDigits: '99988887777', pushName: 'Ana Souza ✂️' });
  assert.deepEqual(supabase.writes, [{ table: 'clients', op: 'insert', value: {
    phone_digits: '99988887777', phone: '(99) 98888-7777', name: 'Ana Souza', notes: PROFILE_NAME_NOTE,
  } }]);

  const semNome = fakeSupabase({ clients: [] });
  await ensureClientRegistered(semNome, { phoneDigits: '99988887777', pushName: '😀😀' });
  assert.equal(semNome.writes.length, 0, 'sem nome utilizável a Vicky pergunta antes de cadastrar');

  const jaExiste = fakeSupabase({ clients: [{ name: 'Vinicius Freitas', notes: null }] });
  await ensureClientRegistered(jaExiste, { phoneDigits: '99981392210', pushName: 'Outro Nome' });
  assert.equal(jaExiste.writes.length, 0, 'não duplica nem altera cadastro existente');
});

test('cadastrar_cliente confirma nome do perfil mas não sobrescreve cadastro confirmado', async () => {
  const doPerfil = fakeSupabase({ clients: [{ name: 'Aninha', notes: PROFILE_NAME_NOTE }] });
  assert.match(await saveClientName(doPerfil, { phoneDigits: '99988887777', name: 'Ana Souza' }), /confirmado: Ana Souza/);
  assert.equal(doPerfil.writes[0].op, 'update');
  assert.equal(doPerfil.writes[0].value.name, 'Ana Souza');
  assert.equal(doPerfil.writes[0].value.notes, null);

  const confirmado = fakeSupabase({ clients: [{ name: 'Vinicius Freitas', notes: null }] });
  assert.match(await saveClientName(confirmado, { phoneDigits: '99981392210', name: 'Fulano' }), /já cadastrado como Vinicius Freitas/);
  assert.equal(confirmado.writes.length, 0);

  const novo = fakeSupabase({ clients: [] });
  assert.match(await executeTool('cadastrar_cliente', { nome: 'João Silva' }, { supabase: novo, phoneDigits: '99911112222' }), /cadastrado: João Silva/);
  assert.deepEqual(novo.writes[0].value, { phone_digits: '99911112222', phone: '(99) 91111-2222', name: 'João Silva' });
});

test('contexto avisa a Vicky para perguntar o nome quando ainda não foi confirmado', async () => {
  const doPerfil = fakeSupabase({ clients: [{ name: 'Aninha', notes: PROFILE_NAME_NOTE }] });
  const ctx = await buildContext(doPerfil, { phoneDigits: '99988887777', pushName: 'Aninha', now: NOW });
  assert.match(ctx.text, /Aninha \(nome do perfil do WhatsApp: use esse nome, não pergunte\)/);

  const semNome = await buildContext(fakeSupabase({}), { phoneDigits: '99981392210', pushName: '🔥🔥', now: NOW });
  assert.match(semNome.text, /sem nome no cadastro nem no perfil do WhatsApp: pergunte só o nome/);
  const soPerfil = await buildContext(fakeSupabase({}), { phoneDigits: '99981392210', pushName: 'Carlos ✂️', now: NOW });
  assert.match(soPerfil.text, /Carlos \(nome do perfil do WhatsApp: use esse nome, não pergunte\)/);

  const confirmado = fakeSupabase({ clients: [{ name: 'Vinicius Freitas', notes: null }] });
  const ok = await buildContext(confirmado, { phoneDigits: '99981392210', now: NOW });
  assert.match(ok.text, /Vinicius Freitas \(cadastrado\)/);
});

test('confirmação 1 hora antes do horário, sem repetir e sem avisar quem acabou de agendar', () => {
  // NOW = 12:00 em Fortaleza. Horário às 12:45 (765 min) entra; 13:30 (810 min) ainda não.
  const base = { services: [{ name: 'Barba' }], client_name: 'Pedro Lima', created_at: '2026-11-01T10:00:00Z' };
  const bookings = [
    { ...base, id: 'h1', date_key: TODAY, time_slot: 765, client_phone: '(99) 97777-1111' },
    { ...base, id: 'h2', date_key: TODAY, time_slot: 810, client_phone: '(99) 97777-2222' },
    { ...base, id: 'h3', date_key: TODAY, time_slot: 750, client_phone: '(99) 97777-3333', created_at: new Date(NOW - 30 * 60_000).toISOString() },
  ];
  const plan = planFollowups({ bookings, recentPhones: new Set(['99977771111']), now: NOW });
  assert.deepEqual(plan.map((item) => [item.kind, item.ref]), [['lembrete_1h', 'h1']]);
  assert.equal(plan[0].message, 'Oi, Pedro! Hoje às 12:45, Barba. Te esperamos!');
  assert.equal(planFollowups({ bookings, sentRefs: new Set(['lembrete_1h:h1']), now: NOW }).length, 0);
});

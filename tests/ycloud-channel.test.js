import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { TEMPLATES, templateParams, toE164, verifyYcloudSignature } from '../api/_ycloud.js';
import { parseMessage, pendingFrom } from '../api/ycloud-webhook.js';
import { planFollowups } from '../api/_followups.js';
import { sendMessages } from '../api/_channel.js';
import { localNow } from '../src/server/agentUtils.js';

const NOW = Date.parse('2026-11-19T15:00:00Z'); // meio-dia em Fortaleza

function sign(body, secret, at = NOW) {
  const t = Math.floor(at / 1000);
  const s = crypto.createHmac('sha256', secret).update(`${t}.`).update(body).digest('hex');
  return `t=${t},s=${s}`;
}

test('assinatura do webhook da YCloud: aceita a correta e recusa adulterada, velha ou sem segredo', () => {
  const body = Buffer.from('{"id":"evt_1","type":"whatsapp.inbound_message.received"}');
  const header = sign(body, 'segredo');
  assert.equal(verifyYcloudSignature(body, header, 'segredo', NOW), true);
  assert.equal(verifyYcloudSignature(Buffer.from(`${body} `), header, 'segredo', NOW), false);
  assert.equal(verifyYcloudSignature(body, header, 'outro', NOW), false);
  assert.equal(verifyYcloudSignature(body, header, 'segredo', NOW + 10 * 60_000), false);
  assert.equal(verifyYcloudSignature(body, header, '', NOW), false);
  assert.equal(verifyYcloudSignature(body, 't=abc,s=zz', 'segredo', NOW), false);
  assert.equal(verifyYcloudSignature('texto', header, 'segredo', NOW), false);
});

test('mensagens recebidas pela API Oficial: texto, botão, mídia e tipos ignorados', () => {
  assert.deepEqual(parseMessage({ type: 'text', text: { body: ' Oi ' } }), { text: 'Oi' });
  assert.deepEqual(parseMessage({ type: 'interactive', interactive: { button_reply: { id: 'x', title: 'SIM' } } }), { text: 'SIM' });
  assert.deepEqual(parseMessage({ type: 'button', button: { text: 'Confirmar' } }), { text: 'Confirmar' });
  const image = parseMessage({ type: 'image', image: { link: 'https://api.ycloud.com/v2/whatsapp/media/download/1', caption: 'olha', mime_type: 'image/jpeg' } });
  assert.equal(image.media.kind, 'image');
  assert.equal(image.media.caption, 'olha');
  assert.equal(parseMessage({ type: 'voice', voice: { link: 'x', mime_type: 'audio/ogg' } }).media.kind, 'audio');
  assert.deepEqual(parseMessage({ type: 'unsupported', unsupported: { type: 'poll_update' } }), {});
  assert.deepEqual(parseMessage({ type: 'reaction', reaction: { emoji: '👍' } }), {});
});

test('junta as mensagens ainda sem resposta e ignora o que já foi respondido', () => {
  const at = (minutesAgo) => new Date(NOW - minutesAgo * 60_000).toISOString();
  const rows = [
    { id: 1, role: 'user', content: 'antiga', media_type: null, created_at: at(10) },
    { id: 2, role: 'assistant', content: 'resposta', media_type: null, created_at: at(9) },
    { id: 3, role: 'user', content: 'Quero cortar', media_type: null, created_at: at(1) },
    { id: 4, role: 'user', content: '[Imagem] desse jeito', media_type: 'image', created_at: at(1) },
    { id: 5, role: 'user', content: 'amanhã', media_type: null, created_at: at(0) },
  ];
  const pending = pendingFrom(rows, NOW);
  assert.equal(pending.firstId, 3);
  assert.equal(pending.lastId, 5);
  assert.deepEqual(pending.parts, { text: 'Quero cortar\namanhã', captions: ['desse jeito'], media: ['image'] });

  // O salão respondeu depois: não sobra nada para a Vicky.
  assert.equal(pendingFrom([...rows, { id: 6, role: 'assistant', content: 'oi', media_type: null, created_at: at(0) }], NOW).lastId, null);
  // Mensagem de mais de 30 minutos atrás não é reaproveitada.
  assert.equal(pendingFrom([{ id: 9, role: 'user', content: 'velha', media_type: null, created_at: at(45) }], NOW).firstId, null);
});

test('modelos da Meta: todo modelo tem tantos exemplos quanto variáveis, e parâmetros nunca vão vazios', () => {
  for (const [kind, template] of Object.entries(TEMPLATES)) {
    const variables = new Set(template.text.match(/\{\{\d+\}\}/g) || []);
    assert.equal(variables.size, template.example.length, kind);
    assert.ok(!/^\{\{|\}\}$/.test(template.text), `${kind} não pode começar nem terminar com variável`);
    assert.match(template.name, /^[a-z0-9_]+$/);
  }
  assert.deepEqual(templateParams(['Ana', '', 'a\n b   c']), [
    { type: 'text', text: 'Ana' }, { type: 'text', text: '-' }, { type: 'text', text: 'a b c' },
  ]);
  assert.equal(toE164('99981392210'), '+5599981392210');
});

test('lembretes levam as variáveis do modelo na mesma ordem do texto aprovado', () => {
  const today = localNow(NOW).dateKey;
  const bookings = [{
    id: 'b1', date_key: today, time_slot: 765, services: [{ name: 'Barba' }], client_name: 'Pedro Lima',
    client_phone: '(99) 97777-1111', created_at: '2026-11-01T10:00:00Z',
  }];
  const [item] = planFollowups({ bookings, now: NOW });
  assert.equal(item.kind, 'lembrete_1h');
  assert.deepEqual(item.template, { kind: 'lembrete_1h', values: ['Pedro', '12:45', 'Barba'] });
  assert.equal(TEMPLATES[item.template.kind].example.length, item.template.values.length);
});

test('envio pelo canal oficial usa modelo quando há, texto quando não, e relata falhas sem parar a fila', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, key: options.headers['X-API-Key'], body });
    if (body.to === '+5599900000000') return new Response(JSON.stringify({ error: { message: 'fora da janela de 24 horas' } }), { status: 400 });
    return new Response(JSON.stringify({ id: 'msg_1', status: 'accepted' }), { status: 200 });
  };
  try {
    const channel = { type: 'official', config: { apiKey: 'chave', phoneNumber: '+5599984626896' } };
    const results = await sendMessages(channel, [
      { phoneDigits: '99977771111', message: 'texto', template: { kind: 'lembrete_1h', values: ['Pedro', '12:45', 'Barba'] } },
      { phoneDigits: '99900000000', message: 'resposta livre' },
      { phoneDigits: '99977772222', message: 'outra resposta' },
    ]);
    assert.deepEqual(results.map((r) => r.ok), [true, false, true]);
    assert.match(results[1].error, /24 horas/);
    assert.equal(calls[0].url, 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly');
    assert.equal(calls[0].key, 'chave');
    assert.equal(calls[0].body.type, 'template');
    assert.equal(calls[0].body.template.name, 'vc_lembrete_1h');
    assert.equal(calls[0].body.template.language.code, 'pt_BR');
    assert.deepEqual(calls[0].body.template.components[0].parameters.map((p) => p.text), ['Pedro', '12:45', 'Barba']);
    assert.deepEqual(calls[2].body, { from: '+5599984626896', to: '+5599977772222', type: 'text', text: { body: 'outra resposta' } });
  } finally {
    globalThis.fetch = original;
  }
  await assert.rejects(() => sendMessages({ type: 'official', config: null }, []), /não configurado/);
});

// Banco simulado: guarda o que foi gravado em cada tabela.
function fakeDb() {
  const writes = [];
  let nextId = 100;
  const from = (table) => {
    const b = {
      select: () => b, eq: () => b, or: () => b, order: () => b, limit: () => b,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: { id: nextId++ }, error: null }),
      insert: (value) => { writes.push({ table, op: 'insert', value }); return Object.assign(Promise.resolve({ error: null }), b); },
      upsert: async (value) => { writes.push({ table, op: 'upsert', value }); return { error: null }; },
      update: (value) => { writes.push({ table, op: 'update', value }); return b; },
      then: (resolve) => resolve({ data: [], error: null }),
    };
    return b;
  };
  return { from, writes };
}

test('webhook: mensagem do cliente é registrada e cadastrada; resposta do app pausa a Vicky', async () => {
  const { dispatchEvent, readRawBody } = await import('../api/ycloud-webhook.js');
  const config = { apiKey: 'chave', phoneNumber: '+5599984626896' };

  const db = fakeDb();
  const later = await dispatchEvent(db, config, {
    id: 'evt_1', type: 'whatsapp.inbound_message.received',
    whatsappInboundMessage: { from: '+5599981392210', customerProfile: { name: 'Carlos' }, type: 'text', text: { body: 'Quero agendar' } },
  });
  assert.equal(typeof later, 'function');
  const message = db.writes.find((w) => w.table === 'agent_messages');
  assert.deepEqual(message.value, { chat_jid: '5599981392210@s.whatsapp.net', phone_digits: '99981392210', role: 'user', source: 'client', content: 'Quero agendar' });
  assert.equal(db.writes.find((w) => w.table === 'agent_chats').value.contact_name, 'Carlos');
  assert.equal(db.writes.find((w) => w.table === 'clients').value.name, 'Carlos');

  const echoDb = fakeDb();
  const none = await dispatchEvent(echoDb, config, {
    id: 'evt_2', type: 'whatsapp.smb.message.echoes',
    whatsappMessage: { from: '+5599984626896', to: '+5599981392210', type: 'text', text: { body: 'Oi, aqui é o Vinicius' } },
  });
  assert.equal(none, null);
  assert.ok(echoDb.writes.find((w) => w.table === 'agent_chats').value.paused_until);
  assert.equal(echoDb.writes.find((w) => w.table === 'agent_messages').value.source, 'human');

  // Sem número configurado ou evento de outro tipo: nada é gravado.
  const idle = fakeDb();
  assert.equal(await dispatchEvent(idle, { apiKey: 'chave', phoneNumber: '' }, { id: 'e', type: 'whatsapp.inbound_message.received', whatsappInboundMessage: {} }), null);
  assert.equal(await dispatchEvent(idle, config, { id: 'e', type: 'whatsapp.message.updated', whatsappMessage: {} }), null);
  assert.equal(idle.writes.length, 0);

  const { Readable } = await import('node:stream');
  assert.equal((await readRawBody(Readable.from([Buffer.from('{"a":'), Buffer.from('1}')]))).toString(), '{"a":1}');
});

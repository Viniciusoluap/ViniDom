import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_REPLY, composeAgentInput, isAudioOnly } from '../api/_agent.js';
import { baseMime, mediaLabel } from '../api/_media.js';
import { homeForSession } from '../src/utils/authRoles.js';

test('áudio sozinho recebe a resposta fixa, sem passar pelo modelo', () => {
  assert.equal(isAudioOnly({ media: ['audio'] }), true);
  assert.equal(isAudioOnly({ media: ['audio', 'audio'] }), true);
  assert.equal(isAudioOnly({ text: 'oi', media: ['audio'] }), false);
  assert.equal(isAudioOnly({ media: ['audio', 'image'] }), false);
  assert.equal(isAudioOnly({ text: 'oi' }), false);
  assert.equal(AUDIO_REPLY, 'Não ouço áudios por aqui. Pode me escrever?');
});

test('a Vicky só fica sabendo do tipo de mídia, mais legendas e texto', () => {
  const input = composeAgentInput({ text: 'Quero esse corte', captions: ['olha esse'], media: ['image', 'image'] });
  assert.equal(input, '[O cliente enviou uma imagem. Você não vê imagens.]\nolha esse\nQuero esse corte');
  assert.equal(composeAgentInput({}), '');
  assert.match(composeAgentInput({ text: 'oi', media: ['audio'] }), /não ouve áudios/);
});

test('rótulo da mídia na lista de conversas', () => {
  assert.equal(mediaLabel('image'), '[Imagem]');
  assert.equal(mediaLabel('image', { caption: ' olha ' }), '[Imagem] olha');
  assert.equal(mediaLabel('document', { fileName: 'tabela.pdf' }), '[Documento: tabela.pdf]');
  assert.equal(baseMime('audio/ogg; codecs=opus'), 'audio/ogg');
});

test('acesso único: cada perfil vai para a sua área', () => {
  assert.equal(homeForSession({ user: { app_metadata: { role: 'admin' } } }), '/admin');
  assert.equal(homeForSession({ user: { app_metadata: { role: 'staff', professional_name: 'Ana' } } }), '/funcionario');
  assert.equal(homeForSession({ user: { app_metadata: { role: 'staff', professional_name: 'Ana', active: false } } }), null);
  assert.equal(homeForSession({ user: { app_metadata: { role: 'staff' } } }), null);
  assert.equal(homeForSession({ user: { app_metadata: {} } }), null);
  assert.equal(homeForSession(null), null);
});

test('lista de clientes junta agendamentos e cadastro (disparo em massa usa a mesma)', async () => {
  const { mergeClients } = await import('../src/utils/clientDirectory.js');
  const bookings = [{ client: { name: 'Vini', phone: '(99) 98462-6896' }, date: '2026-06-29', status: 'attended', totalPrice: 80 }];
  const registered = [
    { phone_digits: '99984626896', phone: '(99) 98462-6896', name: 'Vinicius cavalcante' },
    { phone_digits: '99981392210', phone: '(99) 98139-2210', name: 'Vinicius Freitas' },
  ];
  const list = mergeClients(bookings, registered);
  assert.deepEqual(list.map((c) => [c.name, c.visits]), [['Vinicius cavalcante', 1], ['Vinicius Freitas', 0]]);
});

test('escolha do profissional: nome completo, primeiro nome ou sem preferência', async () => {
  const { pickProfessional, listProfessionals, buildContext } = await import('../api/_agent.js');
  const pros = ['Vinicius Cavalcante', 'Ana Júlia'];
  assert.equal(pickProfessional(pros, 'ana julia'), 'Ana Júlia');
  assert.equal(pickProfessional(pros, 'Ana'), 'Ana Júlia');
  assert.equal(pickProfessional(pros, ''), 'Vinicius Cavalcante');
  assert.equal(pickProfessional(pros, 'tanto faz'), 'Vinicius Cavalcante');
  assert.equal(pickProfessional(pros, 'Pedro'), null);

  const fakeAuth = { auth: { admin: { listUsers: async () => ({ data: { users: [
    { app_metadata: { role: 'staff', professional_name: 'Ana Júlia' } },
    { app_metadata: { role: 'staff', professional_name: 'Inativo', active: false } },
    { app_metadata: { role: 'admin' } },
  ] }, error: null }) } } };
  assert.deepEqual(await listProfessionals(fakeAuth), ['Vinicius Cavalcante', 'Cassiano', 'Ana Júlia']);

  const empty = { from: () => { const b = { select: () => b, eq: () => b, ilike: () => b, neq: () => b, order: () => b, limit: () => b, maybeSingle: async () => ({ data: null }), then: (r) => r({ data: [] }) }; return b; } };
  const ctx = await buildContext(empty, { phoneDigits: '99981392210', pushName: 'Carlos', settings: { address: 'Rua X, 10', mapsUrl: 'https://maps.app.goo.gl/abc' }, professionals: pros });
  assert.match(ctx.text, /Endereço do salão: Rua X, 10 — mapa: https:\/\/maps\.app\.goo\.gl\/abc/);
  assert.match(ctx.text, /Profissionais: Vinicius Cavalcante, Ana Júlia \(pergunte com qual o cliente prefere\)/);
});

test('aba Clientes lista quem só tem nome, agrupado, sem bloqueios; o disparo continua só com telefone', async () => {
  const { mergeClients } = await import('../src/utils/clientDirectory.js');
  const corte = [{ name: 'Corte Masculino', category: 'Cortes' }];
  const bookings = [
    { client: { name: 'Augusto Junior', phone: '' }, date: '2026-11-17', status: 'confirmed', totalPrice: 160, services: corte },
    { client: { name: 'AUGUSTO  JUNIOR', phone: '' }, date: '2026-11-18', status: 'confirmed', totalPrice: 160, services: corte },
    { client: { name: 'ALMOÇO', phone: '' }, date: '2026-11-18', status: 'confirmed', totalPrice: 0, services: [{ name: 'Bloqueio de horário', category: 'Bloqueio' }] },
    { client: { name: 'Ana', phone: '(99) 98888-7777' }, date: '2026-11-18', status: 'confirmed', totalPrice: 280, services: corte },
  ];
  const all = mergeClients(bookings, [], { includeWithoutPhone: true });
  assert.deepEqual(all.map((c) => [c.name, c.visits, Boolean(c.noPhone)]), [['AUGUSTO  JUNIOR', 2, true], ['Ana', 1, false]]);
  assert.equal(all[0].phone, '');
  assert.deepEqual(mergeClients(bookings, []).map((c) => c.name), ['Ana']);
});

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

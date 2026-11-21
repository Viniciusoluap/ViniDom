import crypto from 'node:crypto';
import { readSetting } from './_whatsapp.js';

// API Oficial do WhatsApp pela YCloud (provedor autorizado pela Meta).
const API_BASE = 'https://api.ycloud.com/v2';
const LANGUAGE = 'pt_BR';
const SALON = 'Vinicius Cavalcante Visagismo';

// Mensagens que o salão inicia precisam de modelo aprovado pela Meta. O texto livre só vale
// para responder quem escreveu nas últimas 24 horas.
export const TEMPLATES = {
  confirmacao: {
    name: 'vc_confirmacao_vespera',
    category: 'UTILITY',
    text: 'Olá, {{1}}! Lembrete do seu horário amanhã ({{2}}) às {{3}}: {{4}}. Você confirma presença? Responda SIM ou NÃO.',
    example: ['Ana', '20/11', '14:00', 'Corte Feminino'],
  },
  lembrete_1h: {
    name: 'vc_lembrete_1h',
    category: 'UTILITY',
    text: 'Olá, {{1}}! Seu horário é hoje às {{2}}: {{3}}. Estamos te esperando.',
    example: ['Ana', '14:00', 'Corte Feminino'],
  },
  pos_atendimento: {
    name: 'vc_pos_atendimento',
    category: 'UTILITY',
    text: `Olá, {{1}}! Obrigado pela visita ao ${SALON}. Se tiver qualquer dúvida sobre o atendimento, é só responder esta mensagem.`,
    example: ['Ana'],
  },
  aniversario: {
    name: 'vc_aniversario',
    category: 'MARKETING',
    text: `Feliz aniversário, {{1}}! Um abraço de toda a equipe do ${SALON}.`,
    example: ['Ana'],
  },
  retorno: {
    name: 'vc_retorno',
    category: 'MARKETING',
    text: 'Olá, {{1}}! Já faz {{2}} dias da sua última visita. Quer agendar um novo horário? É só responder esta mensagem.',
    example: ['Ana', '30'],
  },
  aviso_equipe: {
    name: 'vc_aviso_equipe',
    category: 'UTILITY',
    text: 'Aviso da Vicky: {{1}} pediu atendimento pessoal. Resumo: {{2}}. Abra o painel para responder.',
    example: ['Ana (99) 99999-9999', 'quer falar sobre um pedido especial'],
  },
};

export async function getYcloudConfig(supabase) {
  const stored = (await readSetting(supabase, 'whatsapp_ycloud')) || {};
  const config = {
    apiKey: process.env.YCLOUD_API_KEY || stored.apiKey || '',
    webhookSecret: stored.webhookSecret || '',
    urlToken: stored.urlToken || '',
    phoneNumber: stored.phoneNumber || '',
    wabaId: stored.wabaId || '',
  };
  return config.apiKey ? config : null;
}

export const isYcloudReady = (config) => Boolean(config?.apiKey && config?.phoneNumber);

// Cabeçalho "YCloud-Signature: t=<segundos>,s=<hmac sha256 em hex>" sobre `${t}.${corpo bruto}`.
export function verifyYcloudSignature(rawBody, header, secret, now = Date.now()) {
  if (!Buffer.isBuffer(rawBody) || typeof header !== 'string' || !secret) return false;
  const fields = header.split(',').map((part) => part.trim().split('='));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  const signature = fields.find(([key]) => key === 's')?.[1];
  if (!/^\d+$/.test(timestamp || '') || !/^[a-fA-F0-9]{64}$/.test(signature || '')) return false;
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export const toE164 = (phoneDigits) => `+55${phoneDigits}`;

async function ycloudFetch(config, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'X-API-Key': config.apiKey, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `A YCloud respondeu ${response.status}.`;
    throw Object.assign(new Error(message), { status: response.status, code: data?.error?.code });
  }
  return data;
}

export function sendYcloudText(config, phoneDigits, text) {
  return ycloudFetch(config, '/whatsapp/messages/sendDirectly', {
    method: 'POST',
    body: { from: config.phoneNumber, to: toE164(phoneDigits), type: 'text', text: { body: String(text).slice(0, 4000) } },
  });
}

// A Meta recusa parâmetro vazio, com quebra de linha ou com muitos espaços seguidos.
export function templateParams(values) {
  return values.map((value) => {
    const clean = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
    return { type: 'text', text: clean || '-' };
  });
}

export function sendYcloudTemplate(config, phoneDigits, kind, values) {
  const template = TEMPLATES[kind];
  if (!template) throw new Error(`Modelo desconhecido: ${kind}`);
  return ycloudFetch(config, '/whatsapp/messages/sendDirectly', {
    method: 'POST',
    body: {
      from: config.phoneNumber,
      to: toE164(phoneDigits),
      type: 'template',
      template: {
        name: template.name,
        language: { code: LANGUAGE, policy: 'deterministic' },
        components: [{ type: 'body', parameters: templateParams(values) }],
      },
    },
  });
}

export async function listYcloudPhones(config) {
  const data = await ycloudFetch(config, '/whatsapp/phoneNumbers?limit=100');
  return (data.items || []).map((item) => ({
    phoneNumber: item.phoneNumber,
    wabaId: item.wabaId,
    status: item.status || null,
    qualityRating: item.qualityRating || null,
    verifiedName: item.verifiedName || null,
  }));
}

export async function listYcloudTemplates(config) {
  if (!config.wabaId) return [];
  const data = await ycloudFetch(config, `/whatsapp/templates?limit=100&filter.wabaId=${encodeURIComponent(config.wabaId)}`);
  const byName = new Map((data.items || []).filter((item) => item.language === LANGUAGE).map((item) => [item.name, item]));
  return Object.entries(TEMPLATES).map(([kind, template]) => {
    const found = byName.get(template.name);
    return {
      kind,
      name: template.name,
      text: template.text,
      requestedCategory: template.category,
      category: found?.category || null,
      status: found?.status || 'NAO_CRIADO',
      reason: found?.reason || null,
    };
  });
}

// Cria na YCloud os modelos que ainda não existem. A aprovação é da Meta e pode levar de minutos a um dia.
export async function ensureYcloudTemplates(config) {
  if (!config.wabaId) throw new Error('Conecte o número na YCloud antes de criar os modelos.');
  const current = await listYcloudTemplates(config);
  const results = [];
  for (const item of current) {
    if (item.status !== 'NAO_CRIADO') { results.push({ name: item.name, created: false, status: item.status }); continue; }
    const template = TEMPLATES[item.kind];
    try {
      const created = await ycloudFetch(config, '/whatsapp/templates', {
        method: 'POST',
        body: {
          wabaId: config.wabaId,
          name: template.name,
          language: LANGUAGE,
          category: template.category,
          components: [{ type: 'BODY', text: template.text, example: { body_text: [template.example] } }],
        },
      });
      results.push({ name: template.name, created: true, status: created.status || 'PENDING' });
    } catch (error) {
      results.push({ name: template.name, created: false, status: 'ERRO', error: error.message });
    }
  }
  return results;
}

// Baixa o arquivo recebido (o link da YCloud já vem assinado) e devolve em base64 para o armazenamento.
export async function downloadYcloudMedia(config, link, maxBytes) {
  if (!link || !/^https:\/\/api\.ycloud\.com\//.test(link)) return null;
  try {
    const response = await fetch(link, { headers: { 'X-API-Key': config.apiKey }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maxBytes) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length && buffer.length <= maxBytes ? buffer.toString('base64') : null;
  } catch (error) {
    console.error('[ycloud] Falha ao baixar mídia:', error.message);
    return null;
  }
}

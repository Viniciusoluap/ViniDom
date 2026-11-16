import express from 'express';
import qrcode from 'qrcode';
import pino from 'pino';
import fs from 'node:fs';
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  generateMessageIDV2,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';

const PORT = process.env.PORT || 3000;
const SERVICE_SECRET = process.env.SERVICE_SECRET || '';
const AUTH_DIR = process.env.AUTH_DIR || './auth';
const MIN_DELAY_MS = 2500;
const MAX_DELAY_MS = 6000;
const AGENT_WEBHOOK_URL = process.env.AGENT_WEBHOOK_URL || 'https://vcvisagismo.com/api/agent-inbound';
const DEBOUNCE_MS = 5000;
const MAX_MESSAGE_AGE_S = 5 * 60;
const MAX_MEDIA_BYTES = 3 * 1024 * 1024; // acima disso o painel mostra só o aviso (limite de envio para a Vercel)
const silentLogger = pino({ level: 'silent' });

if (!SERVICE_SECRET) {
  console.error('SERVICE_SECRET não definido. Configure essa variável de ambiente antes de iniciar o serviço.');
  process.exit(1);
}

let sock = null;
let latestQr = null;
let connectionState = 'connecting'; // connecting | qr_pending | connected | disconnected
let connectedPhone = null;

// IDs das mensagens enviadas por este serviço: as demais mensagens "fromMe" foram digitadas no celular.
const botSentIds = new Set();
function rememberSent(id) {
  if (!id) return;
  botSentIds.add(id);
  if (botSentIds.size > 5000) botSentIds.delete(botSentIds.values().next().value);
}

async function resolveJid(digits) {
  const fallback = `55${digits}@s.whatsapp.net`;
  try {
    const [result] = await sock.onWhatsApp(`55${digits}`);
    return result?.exists ? result.jid : fallback;
  } catch {
    return fallback;
  }
}

async function sendText(jid, text) {
  // Registra o ID antes de enviar: o eco da própria mensagem chega antes do retorno do sendMessage.
  const messageId = generateMessageIDV2(sock.user?.id);
  rememberSent(messageId);
  return sock.sendMessage(jid, { text }, { messageId });
}

function unwrap(message) {
  return message?.ephemeralMessage?.message || message?.viewOnceMessage?.message || message?.viewOnceMessageV2?.message || message || {};
}

function extractText(message) {
  const m = unwrap(message);
  if (m.protocolMessage || m.reactionMessage || m.pollUpdateMessage || (m.senderKeyDistributionMessage && Object.keys(m).length === 1)) return null;
  const text = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption
    || m.buttonsResponseMessage?.selectedDisplayText || m.listResponseMessage?.title || m.templateButtonReplyMessage?.selectedDisplayText;
  if (text) return String(text);
  if (m.contactMessage || m.contactsArrayMessage) return '[contato compartilhado]';
  if (m.locationMessage || m.liveLocationMessage) return '[localização compartilhada]';
  return null;
}

// Foto, áudio, vídeo, figurinha ou documento: o arquivo vai para o painel, e a Vicky só fica sabendo do tipo.
function extractMedia(message) {
  const m = unwrap(message);
  const doc = m.documentMessage || m.documentWithCaptionMessage?.message?.documentMessage;
  if (m.imageMessage) return { kind: 'image', node: m.imageMessage, caption: m.imageMessage.caption || '' };
  if (m.videoMessage) return { kind: 'video', node: m.videoMessage, caption: m.videoMessage.caption || '' };
  if (m.audioMessage) return { kind: 'audio', node: m.audioMessage, caption: '' };
  if (m.stickerMessage) return { kind: 'sticker', node: m.stickerMessage, caption: '' };
  if (doc) return { kind: 'document', node: doc, caption: doc.caption || '' };
  return null;
}

function numberOf(value) {
  return Number(value?.toNumber?.() ?? value?.low ?? value ?? 0);
}

async function forwardMedia(msg, media, { jid, phone, name, fromMe }) {
  let data = null;
  const declaredSize = numberOf(media.node.fileLength);
  if (!declaredSize || declaredSize <= MAX_MEDIA_BYTES) {
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: silentLogger, reuploadRequest: sock.updateMediaMessage });
      if (buffer.length <= MAX_MEDIA_BYTES) data = buffer.toString('base64');
    } catch (err) {
      console.error('[media] Falha ao baixar arquivo:', err.message);
    }
  }
  await callAgent({
    type: 'media',
    jid,
    phone,
    name,
    fromMe: Boolean(fromMe),
    caption: media.caption,
    media: { kind: media.kind, mime: media.node.mimetype || null, fileName: media.node.fileName || null, data },
  });
}

function isPrivateChat(jid) {
  return Boolean(jid) && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid'));
}

function phoneFromKey(key) {
  const candidates = [key.remoteJid, key.senderPn, key.remoteJidAlt, key.participantPn];
  const pn = candidates.find((jid) => jid && jid.endsWith('@s.whatsapp.net'));
  return pn ? pn.split('@')[0].split(':')[0] : null;
}

async function callAgent(payload) {
  const response = await fetch(AGENT_WEBHOOK_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(75_000),
  });
  return response.json().catch(() => ({}));
}

const pending = new Map(); // jid -> { texts, name, phone, timer }
const queues = new Map(); // jid -> Promise (uma resposta por vez em cada conversa)

function enqueue(jid, task) {
  const previous = queues.get(jid) || Promise.resolve();
  const next = previous.then(task).catch((err) => console.error('[agent] Falha ao atender', jid, err.message));
  queues.set(jid, next);
  next.finally(() => { if (queues.get(jid) === next) queues.delete(jid); });
}

async function flush(jid) {
  const entry = pending.get(jid);
  pending.delete(jid);
  if (!entry || !sock || connectionState !== 'connected') return;
  const result = await callAgent({
    type: 'message', jid, phone: entry.phone, name: entry.name,
    text: entry.texts.join('\n'), captions: entry.captions, media: entry.media,
  });
  const reply = String(result?.reply || '').trim();
  if (!reply) return;
  await sock.sendPresenceUpdate('composing', jid).catch(() => {});
  await sleep(Math.min(1200 + reply.length * 25, 4000));
  await sendText(jid, reply);
  await sock.sendPresenceUpdate('paused', jid).catch(() => {});
}

function handleIncoming(msg, type) {
  const jid = msg.key?.remoteJid;
  if (!msg.message || !isPrivateChat(jid)) return;
  const ts = msg.messageTimestamp;
  const sentAt = typeof ts === 'object' && ts !== null ? Number(ts.toNumber?.() ?? ts.low ?? 0) : Number(ts || 0);
  const ageSeconds = Math.floor(Date.now() / 1000) - sentAt;
  if (ageSeconds > MAX_MESSAGE_AGE_S) return;
  const media = extractMedia(msg.message);
  const text = media ? null : extractText(msg.message);
  if (!media && text === null) return;

  if (msg.key.fromMe) {
    if (botSentIds.has(msg.key.id)) return;
    const phone = phoneFromKey(msg.key);
    if (media) enqueue(jid, () => forwardMedia(msg, media, { jid, phone, fromMe: true }));
    else enqueue(jid, () => callAgent({ type: 'human_reply', jid, phone, text }));
    return;
  }
  if (type !== 'notify') return;

  const entry = pending.get(jid) || { texts: [], captions: [], media: [], name: msg.pushName || '', phone: phoneFromKey(msg.key) };
  if (msg.pushName) entry.name = msg.pushName;
  if (media) {
    // O arquivo entra na fila antes da resposta, para aparecer na ordem certa no painel.
    enqueue(jid, () => forwardMedia(msg, media, { jid, phone: entry.phone, name: entry.name }));
    entry.media.push(media.kind);
    if (media.caption) entry.captions.push(media.caption);
  } else {
    entry.texts.push(text);
  }
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => enqueue(jid, () => flush(jid)), DEBOUNCE_MS);
  pending.set(jid, entry);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
}

async function connectToWhatsApp() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    for (const msg of messages || []) {
      try {
        handleIncoming(msg, type);
      } catch (err) {
        console.error('[agent] Mensagem ignorada:', err.message);
      }
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQr = qr;
      connectionState = 'qr_pending';
    }

    if (connection === 'open') {
      latestQr = null;
      connectionState = 'connected';
      connectedPhone = sock?.user?.id?.split(':')[0] || null;
      console.log('[whatsapp-web] Conectado como', connectedPhone);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      connectionState = 'disconnected';
      connectedPhone = null;
      console.log('[whatsapp-web] Conexão encerrada. Logout definitivo?', loggedOut);
      if (!loggedOut) {
        setTimeout(() => { connectToWhatsApp().catch((err) => console.error('[whatsapp-web] Falha ao reconectar:', err)); }, 3000);
      } else {
        latestQr = null;
      }
    }
  });
}

connectToWhatsApp().catch((err) => console.error('[whatsapp-web] Falha ao iniciar conexão:', err));

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token !== SERVICE_SECRET) return res.status(401).json({ error: 'Não autorizado.' });
  next();
});

app.get('/status', (req, res) => {
  res.json({ status: connectionState, phone: connectedPhone });
});

app.get('/qr', async (req, res) => {
  if (!latestQr) return res.json({ qrDataUrl: null });
  try {
    const qrDataUrl = await qrcode.toDataURL(latestQr);
    res.json({ qrDataUrl });
  } catch {
    res.json({ qrDataUrl: null });
  }
});

app.post('/disconnect', async (req, res) => {
  try {
    if (sock) await sock.logout();
  } catch {
    // ignora erro de logout — a sessão pode já estar encerrada
  }
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  latestQr = null;
  connectionState = 'disconnected';
  connectedPhone = null;
  res.json({ ok: true });
  connectToWhatsApp().catch((err) => console.error('[whatsapp-web] Falha ao reiniciar conexão:', err));
});

app.post('/send-bulk', async (req, res) => {
  if (connectionState !== 'connected' || !sock) {
    return res.status(409).json({ error: 'WhatsApp Web não está conectado.' });
  }
  const recipients = Array.isArray(req.body?.recipients) ? req.body.recipients : [];
  const results = [];

  for (const recipient of recipients) {
    const digits = String(recipient.phone || '').replace(/\D/g, '');
    const message = String(recipient.message || '').trim();
    try {
      const jid = await resolveJid(digits);
      await sendText(jid, message);
      results.push({ name: recipient.name || '', phone: recipient.phone || '', ok: true, error: null });
    } catch (err) {
      results.push({ name: recipient.name || '', phone: recipient.phone || '', ok: false, error: err.message || 'Falha ao enviar.' });
    }
    if (recipients.indexOf(recipient) < recipients.length - 1) {
      await sleep(randomDelay());
    }
  }

  res.json({ results });
});

app.listen(PORT, () => console.log(`[whatsapp-web] Serviço ouvindo na porta ${PORT}`));

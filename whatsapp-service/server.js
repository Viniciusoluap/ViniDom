import express from 'express';
import qrcode from 'qrcode';
import pino from 'pino';
import fs from 'node:fs';
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';

const PORT = process.env.PORT || 3000;
const SERVICE_SECRET = process.env.SERVICE_SECRET || '';
const AUTH_DIR = process.env.AUTH_DIR || './auth';
const MIN_DELAY_MS = 2500;
const MAX_DELAY_MS = 6000;

if (!SERVICE_SECRET) {
  console.error('SERVICE_SECRET não definido. Configure essa variável de ambiente antes de iniciar o serviço.');
  process.exit(1);
}

let sock = null;
let latestQr = null;
let connectionState = 'connecting'; // connecting | qr_pending | connected | disconnected
let connectedPhone = null;

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
      const jid = `55${digits}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: message });
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

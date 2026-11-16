import crypto from 'node:crypto';

// Fotos, áudios e arquivos das conversas ficam num bucket privado: só o painel (logado) vê, por link temporário.
export const MEDIA_BUCKET = 'whatsapp-media';
export const MEDIA_KINDS = ['image', 'audio', 'video', 'document', 'sticker'];
export const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
const SIGNED_URL_SECONDS = 6 * 3600;

const LABELS = { image: 'Imagem', audio: 'Áudio', video: 'Vídeo', document: 'Documento', sticker: 'Figurinha' };

const EXTENSIONS = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/amr': 'amr',
  'video/mp4': 'mp4', 'video/3gpp': '3gp', 'application/pdf': 'pdf',
};

export function baseMime(mime) {
  return String(mime || '').split(';')[0].trim().toLowerCase();
}

// Texto que representa a mídia na lista de conversas e no histórico da Vicky.
export function mediaLabel(kind, { caption = '', fileName = '' } = {}) {
  const label = `[${LABELS[kind] || 'Arquivo'}${kind === 'document' && fileName ? `: ${String(fileName).slice(0, 80)}` : ''}]`;
  const text = String(caption || '').trim();
  return text ? `${label} ${text}` : label;
}

export async function storeMedia(supabase, { kind, mime, data }) {
  if (!data) return null;
  const buffer = Buffer.from(String(data), 'base64');
  if (!buffer.length || buffer.length > MAX_MEDIA_BYTES) return null;
  const type = baseMime(mime) || 'application/octet-stream';
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const path = `${folder}/${kind}-${crypto.randomUUID()}.${EXTENSIONS[type] || 'bin'}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buffer, { contentType: type, upsert: false });
  if (error) {
    console.error('[media] Falha ao salvar arquivo:', error.message);
    return null;
  }
  return path;
}

export async function signMediaUrls(supabase, paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) {
    console.error('[media] Falha ao gerar links:', error.message);
    return new Map();
  }
  return new Map((data || []).filter((row) => row.signedUrl).map((row) => [row.path, row.signedUrl]));
}

export async function removeMedia(supabase, paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 100) {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(unique.slice(i, i + 100));
    if (error) console.error('[media] Falha ao apagar arquivos:', error.message);
  }
}

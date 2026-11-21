import { useState } from 'react';
import { Check, Copy, RefreshCw, Save, ShieldCheck } from 'lucide-react';

const TEMPLATE_STATUS = {
  APPROVED: { label: 'Aprovado', cls: 'bg-green-100 text-green-700' },
  PENDING: { label: 'Em análise na Meta', cls: 'bg-amber-100 text-amber-700' },
  REJECTED: { label: 'Recusado', cls: 'bg-red-100 text-red-600' },
  PAUSED: { label: 'Pausado', cls: 'bg-red-100 text-red-600' },
  DISABLED: { label: 'Desativado', cls: 'bg-red-100 text-red-600' },
  NAO_CRIADO: { label: 'Ainda não criado', cls: 'bg-warm-50 text-brand-400' },
};

const KIND_LABEL = {
  confirmacao: 'Confirmação na véspera',
  lembrete_1h: 'Lembrete 1 hora antes',
  pos_atendimento: 'Pós-atendimento',
  aniversario: 'Aniversário',
  retorno: 'Retorno',
  aviso_equipe: 'Aviso para você',
};

// Configuração da API Oficial do WhatsApp pela YCloud, em passos.
export default function YcloudPanel({ ycloud, agentChannel, authFetch, onChanged }) {
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [phones, setPhones] = useState(null);
  const [templates, setTemplates] = useState(null);
  const [copied, setCopied] = useState(false);

  const call = async (label, body, successMsg) => {
    setBusy(label);
    setMessage('');
    try {
      const { ok, data } = await authFetch('/api/whatsapp-config', { method: 'POST', body: JSON.stringify(body) });
      if (!ok) throw new Error(data.error || 'Não foi possível concluir.');
      if (data.phones) setPhones(data.phones);
      if (data.templates) setTemplates(data.templates);
      if (successMsg) setMessage(typeof successMsg === 'function' ? successMsg(data) : successMsg);
      await onChanged();
      return data;
    } catch (err) {
      setMessage(err.message);
      return null;
    } finally {
      setBusy('');
    }
  };

  const saveKey = async () => {
    const data = await call('key', { channel: 'ycloud', action: 'save', apiKey: apiKey.trim() },
      (d) => (d.phoneNumber ? `Chave salva. Número conectado: ${d.phoneNumber}.` : 'Chave salva. Nenhum número conectado na YCloud ainda.'));
    if (data) setApiKey('');
  };

  const saveSecret = async () => {
    const data = await call('secret', { channel: 'ycloud', action: 'save', webhookSecret: webhookSecret.trim() }, 'Segredo do webhook salvo.');
    if (data) setWebhookSecret('');
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(ycloud.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage('Não foi possível copiar. Selecione o endereço e copie manualmente.');
    }
  };

  const official = agentChannel === 'official';
  const approved = (templates || []).filter((t) => t.status === 'APPROVED').length;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest flex items-center gap-1.5">
          <ShieldCheck size={13} /> API Oficial pela YCloud
        </h2>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 ${ycloud.ready ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {!ycloud.configured ? 'Não configurado' : ycloud.ready ? `Número ${ycloud.phoneNumber}` : 'Falta conectar o número'}
        </span>
        {official && <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-900 text-white">Vicky atendendo por aqui</span>}
      </div>

      <div className="bg-white border border-brand-100 p-5 space-y-6">
        <div>
          <p className="text-sm font-semibold text-brand-900 mb-1">1. Chave da API</p>
          <p className="text-xs text-brand-400 mb-2">
            Na YCloud: Developers → API Keys. Cole a chave aqui; ela fica guardada no servidor.
            {ycloud.configured && <> Chave atual: <code className="bg-warm-50 px-1">{ycloud.apiKeyPreview}</code></>}
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={ycloud.configured ? 'Colar uma chave nova para trocar' : 'Chave da API da YCloud'}
              autoComplete="off"
              className="input-field text-sm flex-1 min-w-[220px]"
            />
            <button type="button" onClick={saveKey} disabled={busy !== '' || !apiKey.trim()} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-40">
              <Save size={13} /> {busy === 'key' ? 'Conferindo...' : 'Salvar chave'}
            </button>
          </div>
        </div>

        {ycloud.configured && (
          <div>
            <p className="text-sm font-semibold text-brand-900 mb-1">2. Endereço para receber as mensagens (webhook)</p>
            <p className="text-xs text-brand-400 mb-2">
              Na YCloud: Developers → Webhook → Add Endpoints. Cole o endereço abaixo e marque os eventos{' '}
              <code className="bg-warm-50 px-1">whatsapp.inbound_message.received</code> e{' '}
              <code className="bg-warm-50 px-1">whatsapp.smb.message.echoes</code>. Não compartilhe este endereço.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <input type="text" readOnly value={ycloud.webhookUrl} onFocus={(e) => e.target.select()} className="input-field text-xs flex-1 min-w-[220px] font-mono" />
              <button type="button" onClick={copyUrl} className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5">
                {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
              </button>
            </div>
            <p className="text-xs text-brand-400 mb-2">
              Depois de salvar o endpoint, a YCloud mostra um segredo (signing secret). Cole aqui.
              {ycloud.hasWebhookSecret && <strong className="text-green-700"> Segredo já salvo.</strong>}
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Segredo do webhook"
                autoComplete="off"
                className="input-field text-sm flex-1 min-w-[220px]"
              />
              <button type="button" onClick={saveSecret} disabled={busy !== '' || !webhookSecret.trim()} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-40">
                <Save size={13} /> {busy === 'secret' ? 'Salvando...' : 'Salvar segredo'}
              </button>
            </div>
          </div>
        )}

        {ycloud.configured && (
          <div>
            <p className="text-sm font-semibold text-brand-900 mb-1">3. Número e modelos de mensagem</p>
            <p className="text-xs text-brand-400 mb-2">
              Lembretes e avisos que a Vicky inicia precisam de modelos aprovados pela Meta. A aprovação pode levar de minutos a um dia.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" onClick={() => call('status', { channel: 'ycloud', action: 'status' })} disabled={busy !== ''} className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-40">
                <RefreshCw size={13} className={busy === 'status' ? 'animate-spin' : ''} /> Verificar conexão
              </button>
              <button type="button" onClick={() => call('templates', { channel: 'ycloud', action: 'templates' }, 'Modelos enviados para análise da Meta.')} disabled={busy !== '' || !ycloud.ready} className="btn-primary text-xs py-2 px-4 disabled:opacity-40">
                {busy === 'templates' ? 'Criando...' : 'Criar modelos de mensagem'}
              </button>
            </div>
            {phones && (
              <p className="text-xs text-brand-500 mb-2">
                {phones.length
                  ? phones.map((p) => `${p.phoneNumber} (${p.status || 'sem status'}${p.qualityRating ? `, qualidade ${p.qualityRating}` : ''})`).join(' · ')
                  : 'Nenhum número conectado na YCloud ainda.'}
              </p>
            )}
            {templates && (
              <ul className="border border-brand-50 divide-y divide-brand-50">
                {templates.map((t) => {
                  const st = TEMPLATE_STATUS[t.status] || { label: t.status, cls: 'bg-warm-50 text-brand-500' };
                  return (
                    <li key={t.name} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-brand-900 min-w-0">
                        <strong>{KIND_LABEL[t.kind] || t.name}</strong>
                        {t.category && t.category !== t.requestedCategory && <span className="text-amber-700"> · a Meta classificou como {t.category}</span>}
                        {t.reason && t.status === 'REJECTED' && <span className="text-red-600"> · {t.reason}</span>}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {ycloud.configured && (
          <div>
            <p className="text-sm font-semibold text-brand-900 mb-1">4. Por onde a Vicky atende</p>
            <p className="text-xs text-brand-400 mb-2">
              Só mude para a API Oficial depois de conectar o número na YCloud e ter os modelos aprovados
              {templates ? ` (${approved} de ${templates.length} aprovados)` : ''}. Dá para voltar ao WhatsApp Web a qualquer momento.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => call('channel', { channel: 'agent', agentChannel: 'web' }, 'A Vicky voltou a atender pelo WhatsApp Web.')}
                disabled={busy !== '' || !official}
                className={`text-xs py-2 px-4 border ${!official ? 'bg-brand-900 text-white border-brand-900' : 'border-brand-200 text-brand-900 hover:bg-warm-50'} disabled:cursor-default`}
              >
                WhatsApp Web
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Mudar o atendimento da Vicky para a API Oficial? As respostas e os lembretes passam a sair por ela.')) {
                    void call('channel', { channel: 'agent', agentChannel: 'official' }, 'A Vicky passou a atender pela API Oficial.');
                  }
                }}
                disabled={busy !== '' || official || !ycloud.ready}
                className={`text-xs py-2 px-4 border ${official ? 'bg-brand-900 text-white border-brand-900' : 'border-brand-200 text-brand-900 hover:bg-warm-50'} disabled:opacity-50 disabled:cursor-default`}
              >
                API Oficial (YCloud)
              </button>
            </div>
          </div>
        )}

        {message && <p className="text-xs text-brand-500">{message}</p>}
      </div>
    </section>
  );
}

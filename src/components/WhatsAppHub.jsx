import { useEffect, useMemo, useState } from 'react';
import { Pencil, Check, X, RefreshCw, Send, Users, Wifi, WifiOff, Search } from 'lucide-react';
import { formatDateLong } from '../utils/dateFormatter';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'vcvisagismo_wa_templates';

const DEFAULT_TEMPLATES = [
  {
    id: 'birthday',
    name: 'Aniversário',
    emoji: '🎂',
    text: `Olá, {nome}! 🎂🎉 Feliz aniversário! Que hoje seja um dia incrível, cheio de alegria e realizações. Aqui é o Vinicius Cavalcante, e quero te desejar tudo de melhor nessa data tão especial. Você merece muito! 🥳✨`,
  },
  {
    id: 'followup',
    name: 'Follow-up',
    emoji: '💈',
    text: `Olá, {nome}! Tudo bem? 😊 Aqui é o Vinicius Cavalcante. Faz um tempo que não te vejo por aqui e senti sua falta! Que tal agendar um horário e renovar o visual? Estou disponível para deixar você ainda mais incrível. ✂️💈`,
  },
  {
    id: 'reminder',
    name: 'Lembrete de Horário',
    emoji: '⏰',
    text: `Olá, {nome}! 😊 Aqui é o Vinicius Cavalcante. Passando para lembrar do seu horário confirmado. Qualquer dúvida, é só me chamar aqui. Te espero! ✂️`,
  },
];

function loadTemplates() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_TEMPLATES;
  } catch { return DEFAULT_TEMPLATES; }
}

function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function buildClientMap(bookings) {
  const map = new Map();
  bookings.forEach((b) => {
    const phone = (b.client?.phone || '').replace(/\D/g, '');
    if (!phone) return;
    const bDate = new Date(b.date);
    const existing = map.get(phone);
    if (!existing) {
      map.set(phone, {
        name:      b.client.name      || '',
        phone:     b.client.phone     || '',
        birthdate: b.client?.birthdate || '',
        visits:    b.status !== 'cancelled' ? 1 : 0,
        lastVisit: b.status !== 'cancelled' ? bDate : null,
        lastDate:  bDate,
      });
    } else {
      if (bDate > existing.lastDate) {
        existing.name      = b.client.name      || existing.name;
        existing.birthdate = b.client?.birthdate || existing.birthdate;
        existing.lastDate  = bDate;
      }
      if (b.status !== 'cancelled') {
        existing.visits += 1;
        if (!existing.lastVisit || bDate > existing.lastVisit) existing.lastVisit = bDate;
      }
    }
  });
  return Array.from(map.values());
}

const daysSince = (date) => Math.floor((new Date() - new Date(date)) / 86400000);

export default function WhatsAppHub({ bookings }) {
  /* ── Templates ── */
  const [templates, setTemplates] = useState(loadTemplates);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText]   = useState('');

  /* ── Server-side API status ── */
  const [isConnected, setIsConnected] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [configMessage, setConfigMessage] = useState('');

  /* ── Bulk send ── */
  const [bulkSearch, setBulkSearch]         = useState('');
  const [selected, setSelected]             = useState(new Set());
  const [bulkTemplateId, setBulkTemplateId] = useState('');
  const [bulkMessage, setBulkMessage]       = useState('');
  const [sending, setSending]               = useState(false);
  const [sendLog, setSendLog]               = useState(null);

  const clients = useMemo(() => buildClientMap(bookings), [bookings]);

  useEffect(() => {
    let active = true;
    const checkServerConfig = async () => {
      setConfigLoading(true);
      setConfigMessage('');
      if (!supabase) {
        if (active) {
          setIsConnected(false);
          setConfigMessage('Supabase Auth não está configurado.');
          setConfigLoading(false);
        }
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (active) {
          setIsConnected(false);
          setConfigMessage('Faça login novamente para verificar a configuração.');
          setConfigLoading(false);
        }
        return;
      }
      try {
        const response = await fetch('/api/whatsapp-send', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (active) {
          setIsConnected(response.ok && data.configured === true);
          setConfigMessage(data.message || '');
          setConfigLoading(false);
        }
      } catch {
        if (active) {
          setIsConnected(false);
          setConfigMessage('Endpoint de mensagens indisponível.');
          setConfigLoading(false);
        }
      }
    };

    void checkServerConfig();
    const { data: authListener } = supabase?.auth.onAuthStateChange(() => { void checkServerConfig(); }) || { data: null };
    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  /* ── Birthday / Follow-up ── */
  const birthdayToday = useMemo(() => {
    const now     = new Date();
    const todayMM = String(now.getMonth() + 1).padStart(2, '0');
    const todayDD = String(now.getDate()).padStart(2, '0');
    return clients.filter(c => {
      if (!c.birthdate) return false;
      const parts = c.birthdate.split('-');
      return parts[1] === todayMM && parts[2] === todayDD;
    });
  }, [clients]);

  const followUp = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 10);
    return clients
      .filter(c => c.lastVisit && new Date(c.lastVisit) < cutoff)
      .sort((a, b) => new Date(a.lastVisit) - new Date(b.lastVisit));
  }, [clients]);

  /* ── Bulk send handlers ── */
  const filteredClients = useMemo(() =>
    clients.filter(c =>
      c.name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
      c.phone.includes(bulkSearch)
    ),
    [clients, bulkSearch]
  );

  const toggleClient = (phone) => {
    const d = phone.replace(/\D/g, '');
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(d)) n.delete(d); else n.add(d);
      return n;
    });
  };

  const toggleAll = () => {
    const allDigits = filteredClients.map(c => c.phone.replace(/\D/g, ''));
    const allChecked = allDigits.length > 0 && allDigits.every(d => selected.has(d));
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(allDigits));
  };

  const handleTemplateChange = (id) => {
    setBulkTemplateId(id);
    const tpl = templates.find(t => t.id === id);
    setBulkMessage(tpl ? tpl.text : '');
  };

  const sendBulk = async () => {
    if (!isConnected || !selected.size || !bulkMessage.trim() || sending || !supabase) return;
    setSending(true);
    setSendLog(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');
      const recipients = clients
        .filter(c => selected.has(c.phone.replace(/\D/g, '')))
        .map(client => ({
          name: client.name,
          phone: client.phone,
          message: bulkMessage.replace(/\{nome\}/g, client.name),
        }));
      const response = await fetch('/api/whatsapp-send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipients }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Falha no envio server-side.');
      setSendLog(data.results || []);
    } catch (err) {
      setSendLog([{ name: 'Sistema', phone: '', ok: false, error: err.message }]);
    } finally {
      setSending(false);
    }
  };

  /* ── Template handlers ── */
  const startEdit = (tpl) => { setEditingId(tpl.id); setEditText(tpl.text); };

  const saveEdit = (id) => {
    const updated = templates.map(t => t.id === id ? { ...t, text: editText } : t);
    setTemplates(updated); saveTemplates(updated); setEditingId(null);
  };

  const resetTemplate = (id) => {
    const def = DEFAULT_TEMPLATES.find(t => t.id === id);
    if (!def) return;
    const updated = templates.map(t => t.id === id ? { ...t, text: def.text } : t);
    setTemplates(updated); saveTemplates(updated);
    if (editingId === id) setEditingId(null);
  };

  const buildWaLink = (phone, name, templateId) => {
    const tpl    = templates.find(t => t.id === templateId);
    const digits = phone.replace(/\D/g, '');
    const msg    = encodeURIComponent((tpl?.text || '').replace(/\{nome\}/g, name));
    return `https://wa.me/55${digits}?text=${msg}`;
  };

  const sentOk   = sendLog ? sendLog.filter(l => l.ok).length : 0;
  const sentFail = sendLog ? sendLog.filter(l => !l.ok).length : 0;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniStat label="Clientes"         value={clients.length}  icon={<Users size={14} />} />
        <MiniStat label="Enviadas (sessão)" value={sentOk}          icon={<Send size={14} />} />
        <MiniStat label="Sucesso"
          value={sendLog ? (sentOk + sentFail > 0 ? `${Math.round(sentOk / (sentOk + sentFail) * 100)}%` : '—') : '—'}
        />
        <MiniStat label="Falhas" value={sentFail} accent={sentFail > 0} />
      </div>

      {/* ── Conexão API ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest">
            Conexão WhatsApp Business API
          </h2>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isConnected ? 'Configurado' : 'Não configurado'}
          </span>
        </div>

        <div className="bg-blue-50 border border-blue-200 px-4 py-3 mb-4 text-xs text-blue-700 leading-relaxed">
          <strong>WhatsApp Business API (Meta Cloud API)</strong> — Gratuito até 1.000 conversas/mês.
          Requer conta Meta Business verificada e número aprovado. O disparo em massa usa a API oficial
          para enviar mensagens programaticamente para vários clientes simultaneamente.
        </div>

        <div className="bg-white border border-brand-100 p-5">
          <div className="flex items-start gap-3">
            {configLoading ? <RefreshCw size={16} className="text-brand-400 animate-spin mt-0.5" /> : <Wifi size={16} className="text-green-600 mt-0.5" />}
            <div>
              <p className="text-sm font-semibold text-brand-900">Credenciais protegidas no servidor</p>
              <p className="text-xs text-brand-400 mt-1 leading-relaxed">
                O token não é coletado nem armazenado no navegador. Configure `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e `SUPABASE_SERVICE_ROLE_KEY` nas variáveis privadas do Vercel.
              </p>
              {configMessage && <p className="text-xs text-amber-700 mt-2">{configMessage}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* ── Disparo em Massa ── */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">
          Disparo em Massa
        </h2>

        {!isConnected && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-4 text-xs text-amber-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>O envio está indisponível até as variáveis privadas do endpoint server-side serem configuradas no Vercel.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Destinatários */}
          <div className="bg-white border border-brand-100 flex flex-col min-h-0">
            <div className="px-4 pt-4 pb-3 border-b border-brand-50">
              <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-widest mb-2">
                Destinatários
              </p>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300 pointer-events-none" />
                <input
                  type="text"
                  value={bulkSearch}
                  onChange={e => setBulkSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="input-field pl-8 text-sm py-2"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-64">
              {filteredClients.length === 0 ? (
                <p className="text-center text-brand-300 text-sm py-8">Nenhum cliente encontrado.</p>
              ) : filteredClients.map(c => {
                const d       = c.phone.replace(/\D/g, '');
                const checked = selected.has(d);
                return (
                  <label
                    key={d}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-warm-50 transition-colors border-b border-brand-50 last:border-0 ${checked ? 'bg-warm-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleClient(c.phone)}
                      className="w-4 h-4 accent-brand-900"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-900 truncate">{c.name || '—'}</p>
                      <p className="text-xs text-brand-400 truncate">{c.phone}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-brand-50">
              <button
                onClick={toggleAll}
                className="text-xs text-brand-500 hover:text-brand-900 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Users size={12} />
                {filteredClients.length > 0 && filteredClients.every(c => selected.has(c.phone.replace(/\D/g, '')))
                  ? 'Desmarcar todos'
                  : `Selecionar todos (${filteredClients.length})`}
              </button>
            </div>
          </div>

          {/* Mensagem */}
          <div className="bg-white border border-brand-100 p-4 flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-widest mb-1.5">Template</p>
              <select
                value={bulkTemplateId}
                onChange={e => handleTemplateChange(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">— Selecione um template —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 flex flex-col">
              <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-widest mb-1.5">Mensagem</p>
              <textarea
                value={bulkMessage}
                onChange={e => setBulkMessage(e.target.value)}
                placeholder="Digite a mensagem ou selecione um template acima..."
                className="input-field text-sm resize-none flex-1"
                rows={6}
              />
              <p className="text-[10px] text-brand-300 mt-1">{bulkMessage.length} caracteres · Use <code className="bg-warm-50 px-1">{'{nome}'}</code> para o nome do cliente.</p>
            </div>

            <button
              onClick={sendBulk}
              disabled={!isConnected || !selected.size || !bulkMessage.trim() || sending}
              className="btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={14} />
              {sending
                ? 'Enviando...'
                : `Enviar para ${selected.size} contato${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {/* Log de envio */}
        {sendLog && (
          <div className="mt-4 bg-white border border-brand-100">
            <div className="px-4 py-3 border-b border-brand-50 flex items-center justify-between">
              <p className="text-xs font-semibold text-brand-900">Resultado do Disparo</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-green-600 font-bold">✓ {sentOk} enviados</span>
                {sentFail > 0 && <span className="text-red-500 font-bold">✗ {sentFail} falhas</span>}
              </div>
            </div>
            <div className="divide-y divide-brand-50 max-h-48 overflow-y-auto">
              {sendLog.map((l, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={l.ok ? 'text-green-500 font-bold' : 'text-red-400 font-bold'}>
                    {l.ok ? '✓' : '✗'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-900 truncate">{l.name}</p>
                    {!l.ok && <p className="text-xs text-red-400 truncate">{l.error}</p>}
                  </div>
                  <span className="text-xs text-brand-300 shrink-0">{l.phone}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Templates de Mensagem ── */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">
          Templates de Mensagem
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white border border-brand-100 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{tpl.emoji}</span>
                  <p className="font-semibold text-brand-900 text-sm">{tpl.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => resetTemplate(tpl.id)}
                    title="Restaurar padrão"
                    className="p-1.5 text-brand-300 hover:text-brand-700 transition-colors"
                  >
                    <RefreshCw size={12} />
                  </button>
                  {editingId === tpl.id ? (
                    <>
                      <button onClick={() => saveEdit(tpl.id)} className="p-1.5 text-green-600 hover:text-green-700 transition-colors">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-brand-400 hover:text-brand-700 transition-colors">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(tpl)} className="p-1.5 text-brand-400 hover:text-brand-900 transition-colors">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              </div>

              {editingId === tpl.id ? (
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="input-field text-xs leading-relaxed resize-none"
                  rows={6}
                />
              ) : (
                <p className="text-xs text-brand-500 leading-relaxed line-clamp-4">{tpl.text}</p>
              )}

              <p className="text-[10px] text-brand-300 mt-auto">Use <code className="bg-warm-50 px-1">{'{nome}'}</code> para o nome do cliente.</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Aniversariantes de Hoje ── */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1">
          🎂 Aniversariantes de Hoje
        </h2>
        <p className="text-xs text-brand-300 mb-4">Clientes que fazem aniversário hoje.</p>
        {birthdayToday.length === 0 ? (
          <div className="bg-white border border-brand-100 p-6 text-center text-brand-300 text-sm">
            Nenhum aniversariante hoje.
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-widest">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-widest">WhatsApp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-widest">Nascimento</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {birthdayToday.map(c => {
                  const [y, m, d] = (c.birthdate || '').split('-');
                  return (
                    <tr key={c.phone} className="border-b border-amber-100">
                      <td className="px-4 py-3 font-semibold text-brand-900">{c.name || '—'}</td>
                      <td className="px-4 py-3 text-brand-500">{c.phone || '—'}</td>
                      <td className="px-4 py-3 text-brand-400">{d && m ? `${d}/${m}/${y}` : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={buildWaLink(c.phone, c.name, 'birthday')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                        >
                          <WaIcon /> Parabenizar
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Follow-up ── */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1">
          Follow-up — Clientes para Contatar
        </h2>
        <p className="text-xs text-brand-300 mb-4">
          Clientes cuja última visita foi há mais de 10 dias.
          {followUp.length > 0 && (
            <span className="ml-2 inline-flex items-center bg-gold-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {followUp.length}
            </span>
          )}
        </p>
        {followUp.length === 0 ? (
          <div className="bg-white border border-brand-100 p-8 text-center text-brand-300 text-sm">
            Todos os clientes visitaram recentemente.
          </div>
        ) : (
          <div className="bg-white border border-brand-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">WhatsApp</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Última Visita</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Dias</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {followUp.map((c, i) => (
                  <tr key={c.phone} className={`border-b border-brand-50 hover:bg-warm-50 transition-colors ${i % 2 !== 0 ? 'bg-warm-50/40' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-brand-900">{c.name || '—'}</td>
                    <td className="px-4 py-3 text-brand-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-right text-brand-400">
                      {c.lastVisit ? formatDateLong(c.lastVisit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gold-500">
                      {c.lastVisit ? `${daysSince(c.lastVisit)}d` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={buildWaLink(c.phone, c.name, 'followup')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                      >
                        <WaIcon /> Contatar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({ label, value, icon, accent }) {
  return (
    <div className="bg-white border border-brand-100 p-4 flex items-center gap-3">
      {icon && <span className="text-brand-300">{icon}</span>}
      <div>
        <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-widest">{label}</p>
        <p className={`text-xl font-bold leading-tight ${accent ? 'text-red-500' : 'text-brand-900'}`}>{value}</p>
      </div>
    </div>
  );
}

function WaIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

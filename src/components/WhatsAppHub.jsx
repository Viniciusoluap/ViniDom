import { useMemo, useState } from 'react';
import { Pencil, Check, X, MessageCircle, RefreshCw } from 'lucide-react';
import { formatDateLong, formatPrice } from '../utils/dateFormatter';

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
  } catch {
    return DEFAULT_TEMPLATES;
  }
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
        if (!existing.lastVisit || bDate > existing.lastVisit) {
          existing.lastVisit = bDate;
        }
      }
    }
  });
  return Array.from(map.values());
}

const daysSince = (date) => Math.floor((new Date() - new Date(date)) / 86400000);

export default function WhatsAppHub({ bookings }) {
  const [templates, setTemplates] = useState(loadTemplates);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText]   = useState('');

  const clients = useMemo(() => buildClientMap(bookings), [bookings]);

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

  const startEdit = (tpl) => {
    setEditingId(tpl.id);
    setEditText(tpl.text);
  };

  const saveEdit = (id) => {
    const updated = templates.map(t => t.id === id ? { ...t, text: editText } : t);
    setTemplates(updated);
    saveTemplates(updated);
    setEditingId(null);
  };

  const resetTemplate = (id) => {
    const def = DEFAULT_TEMPLATES.find(t => t.id === id);
    if (!def) return;
    const updated = templates.map(t => t.id === id ? { ...t, text: def.text } : t);
    setTemplates(updated);
    saveTemplates(updated);
    if (editingId === id) setEditingId(null);
  };

  const buildWaLink = (phone, name, templateId) => {
    const tpl    = templates.find(t => t.id === templateId);
    const digits = phone.replace(/\D/g, '');
    const msg    = encodeURIComponent((tpl?.text || '').replace(/\{nome\}/g, name));
    return `https://wa.me/55${digits}?text=${msg}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Status de conexão */}
      <div className="bg-green-50 border border-green-200 p-4 flex items-start gap-3">
        <span className="mt-0.5 text-green-500 shrink-0">
          <MessageCircle size={18} />
        </span>
        <div>
          <p className="font-semibold text-green-800 text-sm">WhatsApp Ativo — Envio via Links Diretos</p>
          <p className="text-green-700 text-xs mt-0.5 leading-relaxed">
            Ao clicar em "Enviar", o WhatsApp abrirá no seu dispositivo com a mensagem já preenchida com o template selecionado.
            Os templates são editáveis e salvos localmente.
          </p>
        </div>
      </div>

      {/* Templates de mensagem */}
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

      {/* Aniversariantes de Hoje */}
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

      {/* Follow-up */}
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

function WaIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

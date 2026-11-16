import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bot, Hand, RefreshCw, Search, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

const LIST_POLL_MS = 10000;
const THREAD_POLL_MS = 5000;

const SOURCE_STYLE = {
  client: { label: null, bubble: 'bg-white border border-brand-100 text-brand-900', align: 'justify-start' },
  agent: { label: 'Vicky', bubble: 'bg-brand-900 text-white', align: 'justify-end' },
  human: { label: 'Você', bubble: 'bg-green-600 text-white', align: 'justify-end' },
  auto: { label: 'Automática', bubble: 'bg-amber-100 text-amber-900', align: 'justify-end' },
  bulk: { label: 'Disparo', bubble: 'bg-blue-100 text-blue-900', align: 'justify-end' },
};

async function apiFetch(url, options = {}) {
  if (!supabase) throw new Error('Supabase Auth não está configurado.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Faça login novamente.');
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

function formatWhen(iso) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function WhatsAppConversations({ connected }) {
  const [chats, setChats] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');

  const [selectedKey, setSelectedKey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [paused, setPaused] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { ok, data } = await apiFetch('/api/whatsapp-conversations');
        if (!active) return;
        if (ok) { setChats(data.chats || []); setListError(''); }
        else setListError(data.error || 'Não foi possível carregar as conversas.');
      } catch (err) {
        if (active) setListError(err.message);
      } finally {
        if (active) setListLoading(false);
      }
    };
    void load();
    const id = setInterval(load, LIST_POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, [reloadToken]);

  useEffect(() => {
    if (!selectedKey) return undefined;
    let active = true;
    const load = async () => {
      try {
        const { ok, data } = await apiFetch(`/api/whatsapp-conversations?key=${encodeURIComponent(selectedKey)}`);
        if (!active) return;
        if (ok) { setMessages(data.messages || []); setPaused(Boolean(data.paused)); setThreadError(''); }
        else setThreadError(data.error || 'Não foi possível carregar a conversa.');
      } catch (err) {
        if (active) setThreadError(err.message);
      }
    };
    void load();
    const id = setInterval(load, THREAD_POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, [selectedKey, reloadToken]);

  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages.length, selectedKey]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    if (!term) return chats;
    return chats.filter((chat) => chat.name.toLowerCase().includes(term) || (digits && (chat.phoneDigits || '').includes(digits)));
  }, [chats, search]);

  const selected = chats.find((chat) => chat.key === selectedKey) || null;

  const openChat = (key) => {
    setSelectedKey(key);
    setMessages([]);
    setThreadError('');
    setDraft('');
  };

  const act = async (body) => {
    setBusy(true);
    setThreadError('');
    try {
      const { ok, data } = await apiFetch('/api/whatsapp-conversations', {
        method: 'POST',
        body: JSON.stringify({ key: selectedKey, ...body }),
      });
      if (!ok) throw new Error(data.error || 'Não foi possível concluir.');
      if (body.action === 'send') setDraft('');
      setReloadToken((n) => n + 1);
    } catch (err) {
      setThreadError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    if (!draft.trim() || busy) return;
    void act({ action: 'send', text: draft.trim() });
  };

  return (
    <div className="bg-white border border-brand-100 grid grid-cols-1 lg:grid-cols-[320px_1fr] h-[70vh] min-h-[480px]">
      {/* Lista de conversas */}
      <div className={`flex flex-col min-h-0 min-w-0 lg:border-r border-brand-100 ${selectedKey ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-3 border-b border-brand-50">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="input-field pl-8 text-sm py-2"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {listLoading && <p className="text-center text-brand-300 text-sm py-8">Carregando conversas...</p>}
          {!listLoading && listError && <p className="text-center text-red-600 text-xs px-4 py-8">{listError}</p>}
          {!listLoading && !listError && filtered.length === 0 && (
            <p className="text-center text-brand-300 text-sm px-6 py-8">
              Nenhuma conversa ainda. As mensagens aparecem aqui assim que um cliente escrever no WhatsApp.
            </p>
          )}
          {filtered.map((chat) => (
            <button
              key={chat.key}
              type="button"
              onClick={() => openChat(chat.key)}
              className={`w-full text-left px-4 py-3 border-b border-brand-50 hover:bg-warm-50 transition-colors ${chat.key === selectedKey ? 'bg-warm-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-brand-900 truncate">{chat.name}</p>
                <span className="text-[10px] text-brand-300 shrink-0">{formatWhen(chat.lastAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {chat.paused && <Hand size={11} className="text-amber-600 shrink-0" />}
                <p className="text-xs text-brand-400 truncate">
                  {chat.lastSource !== 'client' && <span className="text-brand-300">{SOURCE_STYLE[chat.lastSource]?.label || 'Salão'}: </span>}
                  {chat.lastMessage}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversa aberta */}
      <div className={`flex flex-col min-h-0 min-w-0 ${selectedKey ? 'flex' : 'hidden lg:flex'}`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-brand-300 text-sm px-6 text-center">
            Selecione uma conversa para ver as mensagens.
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-brand-50 flex items-center gap-3">
              <button type="button" onClick={() => setSelectedKey(null)} className="lg:hidden p-1 text-brand-400 hover:text-brand-900">
                <ArrowLeft size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-900 truncate">{selected.name}</p>
                <p className="text-xs text-brand-400 truncate">
                  {selected.phone || 'Número oculto pelo WhatsApp'} · {paused ? 'Vicky pausada — você está atendendo' : 'Vicky atendendo'}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => act({ action: paused ? 'resume' : 'pause' })}
                className="btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 shrink-0 disabled:opacity-40"
              >
                {paused
                  ? <><Bot size={12} /> Devolver<span className="hidden sm:inline"> para a Vicky</span></>
                  : <><Hand size={12} /> Assumir<span className="hidden sm:inline"> conversa</span></>}
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-warm-50 px-4 py-4 space-y-2">
              {messages.length === 0 && !threadError && (
                <p className="text-center text-brand-300 text-sm py-8"><RefreshCw size={14} className="inline animate-spin mr-1" /> Carregando...</p>
              )}
              {messages.map((message) => {
                const style = SOURCE_STYLE[message.source] || SOURCE_STYLE.agent;
                return (
                  <div key={message.id} className={`flex ${style.align}`}>
                    <div className={`max-w-[80%] px-3 py-2 text-sm whitespace-pre-wrap break-words ${style.bubble}`}>
                      {style.label && <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70 mb-0.5">{style.label}</p>}
                      {message.content}
                      <p className="text-[10px] opacity-60 text-right mt-1">{formatWhen(message.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {threadError && <p className="text-xs text-red-600 px-4 pt-2">{threadError}</p>}
            <div className="p-3 border-t border-brand-50 flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={connected ? 'Escreva sua resposta... (a Vicky pausa nesta conversa por 12h)' : 'Conecte o WhatsApp Web para responder pelo painel'}
                disabled={!connected || busy}
                rows={2}
                className="input-field text-sm resize-none flex-1 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={send}
                disabled={!connected || busy || !draft.trim()}
                className="btn-primary py-2.5 px-4 flex items-center gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={13} /> {busy ? '...' : 'Enviar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

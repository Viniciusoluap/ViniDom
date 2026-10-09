import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Trash2, X, Check, UserPlus } from 'lucide-react';
import { formatPrice, formatDate } from '../utils/dateFormatter';
import { applyPhoneMask } from '../utils/validation';
import { buildClientDirectory, normalizeClientPhone, validateClientDetails } from '../utils/clientDirectory';

const EMPTY_CLIENT = { name: '', phone: '', email: '', birthdate: '' };

export default function ClientsList({ bookings, registeredClients, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState(null);
  const clients = useMemo(() => buildClientDirectory(bookings, registeredClients), [bookings, registeredClients]);

  const handleDelete = async (client) => {
    if (!window.confirm(`Excluir ${client.name || 'este cliente'} e todos os seus agendamentos? Esta ação não pode ser desfeita.`)) return;
    setDeleting(client.phone);
    setMessage(null);
    try {
      await onDelete(client.phone);
      setMessage({ text: 'Cliente excluído.', error: false });
    } catch (err) { setMessage({ text: err.message || 'Não foi possível excluir o cliente.', error: true }); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Total de clientes:</span>
          <span className="text-sm font-bold text-brand-900">{clients.length}</span>
        </div>
        <button id="new-client-button" className="btn-primary flex items-center justify-center gap-2 py-3" disabled={deleting !== null}
          onClick={() => { setMessage(null); setEditing(EMPTY_CLIENT); }}>
          <UserPlus size={16} /> Novo cliente
        </button>
      </div>
      {message && <p role={message.error ? 'alert' : 'status'} className={`p-3 border text-sm ${message.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>{message.text}</p>}
      {editing && <ClientDialog client={editing} clients={clients} onClose={() => setEditing(null)}
        onSave={async values => {
          await onSave(editing.phone || null, values);
          setEditing(null);
          setMessage({ text: editing.phone ? 'Cliente atualizado.' : 'Cliente cadastrado.', error: false });
        }} />}
      {!clients.length ? (
        <div className="bg-white border border-brand-100 p-10 text-center text-brand-400 text-sm">
          Nenhum cliente cadastrado. Clique em Novo cliente para cadastrar o primeiro.
        </div>
      ) : (
      <div className="bg-white border border-brand-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-100 bg-warm-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">WhatsApp</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">E-mail</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Nascimento</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Visitas</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Última Visita</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Total Gasto</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => (
              <tr key={c.phone} className={`border-b border-brand-50 hover:bg-warm-50 transition-colors ${i % 2 !== 0 ? 'bg-warm-50/40' : ''}`}>
                <td className="px-4 py-3 font-semibold text-brand-900">{c.name || '—'}</td>
                <td className="px-4 py-3 text-brand-500">
                  <a
                    href={`https://wa.me/55${c.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-900 transition-colors"
                  >
                    {applyPhoneMask(c.phone)}
                  </a>
                </td>
                <td className="px-4 py-3 text-brand-400">{c.email || '—'}</td>
                <td className="px-4 py-3 text-brand-400">{c.birthdate ? formatBirthdate(c.birthdate) : '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-brand-900">{c.visits}</td>
                <td className="px-4 py-3 text-right text-brand-400">{c.lastVisit ? formatDate(c.lastVisit) : '—'}</td>
                <td className="px-4 py-3 text-right font-semibold text-brand-900">{formatPrice(c.totalSpent)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => { setMessage(null); setEditing(c); }}
                      title="Editar cliente"
                      aria-label={`Editar ${c.name}`}
                      disabled={deleting !== null}
                      className="p-1.5 text-brand-300 hover:text-brand-900 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      title="Excluir"
                      aria-label={`Excluir ${c.name}`}
                      disabled={deleting !== null}
                      className="p-1.5 text-brand-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function ClientDialog({ client, clients, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState({ name: client.name || '', phone: client.phone ? applyPhoneMask(client.phone) : '', email: client.email || '', birthdate: client.birthdate || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    dialog.querySelector('#client-name')?.focus();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus();
      else document.getElementById('new-client-button')?.focus();
    };
  }, []);
  const submit = async event => {
    event.preventDefault();
    if (saving) return;
    const validation = validateClientDetails(form);
    if (validation) { setError(validation); return; }
    const phone = normalizeClientPhone(form.phone);
    if (clients.some(c => c.phone === phone && c.phone !== normalizeClientPhone(client.phone))) {
      setError('Já existe um cliente com este WhatsApp. Edite o cadastro existente.');
      return;
    }
    setSaving(true);
    setError(null);
    try { await onSave(form); }
    catch (err) { setError(err.message || 'Não foi possível salvar o cliente.'); }
    finally { setSaving(false); }
  };
  const fields = [
    { key: 'name', label: 'Nome *', type: 'text', required: true, maxLength: 120, autoComplete: 'name' },
    { key: 'phone', label: 'WhatsApp com DDD *', type: 'tel', required: true, autoComplete: 'tel-national' },
    { key: 'email', label: 'E-mail', type: 'email', maxLength: 254, autoComplete: 'email' },
    { key: 'birthdate', label: 'Nascimento', type: 'date', min: '1900-01-01', max: new Date().toLocaleDateString('en-CA'), autoComplete: 'bday' },
  ];
  return (
    <dialog ref={dialogRef} aria-labelledby="client-dialog-title"
      onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}
      className="w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto bg-white p-6 border border-brand-100 shadow-xl backdrop:bg-black/50">
      <form onSubmit={submit}>
        <div className="flex items-center justify-between mb-5 gap-3">
          <h3 id="client-dialog-title" className="font-bold text-brand-900">{client.phone ? 'Editar cliente' : 'Novo cliente'}</h3>
          <button type="button" aria-label="Fechar formulário" disabled={saving} onClick={onClose} className="p-2 text-brand-400 hover:text-brand-900"><X size={18} /></button>
        </div>
        <fieldset disabled={saving} className="space-y-3">
          {fields.map(({ key, label, ...props }) => (
            <div key={key}>
              <label htmlFor={`client-${key}`} className="text-sm font-medium text-brand-500 block mb-1">{label}</label>
              <input {...props} id={`client-${key}`} className="input-field" value={form[key]}
                onChange={event => setForm(prev => ({ ...prev, [key]: key === 'phone' && event.target.value ? applyPhoneMask(event.target.value) : event.target.value }))} />
            </div>
          ))}
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 p-3">{error}</p>}
        <div className="flex flex-wrap gap-3 mt-5">
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 disabled:opacity-50">
            <Check size={16} /> {saving ? 'Salvando…' : 'Salvar cliente'}
          </button>
          <button type="button" disabled={saving} onClick={onClose} className="btn-secondary py-3">Cancelar</button>
        </div>
      </form>
    </dialog>
  );
}

function formatBirthdate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

import { useState } from 'react';
import { X } from 'lucide-react';
import { applyPhoneMask, validateEmail, validateName, validatePhone } from '../utils/validation';

const INITIAL = { name: '', phone: '', email: '', birthdate: '', notes: '' };

export default function ClientRegistration({ onClose, onSave }) {
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    const message = validateName(form.name) || validatePhone(form.phone) || validateEmail(form.email);
    if (message) { setError(message); return; }
    setSaving(true);
    setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.message || 'Não foi possível cadastrar o cliente.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50" role="dialog" aria-modal="true" aria-label="Cadastrar cliente">
      <form onSubmit={submit} className="bg-white border border-brand-100 w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-brand-900">Cadastrar cliente</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-brand-400"><X size={18} /></button>
        </div>
        <p className="text-xs text-brand-400 mb-5">O WhatsApp identifica o cadastro nos próximos agendamentos.</p>
        {[
          ['name', 'Nome completo', 'text', true],
          ['phone', 'WhatsApp', 'tel', true],
          ['email', 'E-mail', 'email', false],
          ['birthdate', 'Data de nascimento', 'date', false],
        ].map(([key, label, type, required]) => (
          <label key={key} className="block text-xs font-semibold text-brand-500 uppercase tracking-widest mb-4">
            {label}{required && <span className="text-gold-500"> *</span>}
            <input required={required} type={type} value={form[key]}
              onChange={e => setForm(current => ({ ...current, [key]: key === 'phone' ? applyPhoneMask(e.target.value) : e.target.value }))}
              className="input-field mt-1.5 w-full" />
          </label>
        ))}
        <label className="block text-xs font-semibold text-brand-500 uppercase tracking-widest mb-4">
          Observações
          <textarea value={form.notes} onChange={e => setForm(current => ({ ...current, notes: e.target.value }))}
            rows={2} className="input-field mt-1.5 w-full" />
        </label>
        {error && <p role="alert" className="text-red-600 text-xs mb-4">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">{saving ? 'Salvando…' : 'Cadastrar cliente'}</button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}

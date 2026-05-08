import { useState, useRef } from 'react';
import { User, Phone, Mail, MessageSquare, Calendar, CheckCircle } from 'lucide-react';
import { validateName, validatePhone, validateEmail, applyPhoneMask } from '../utils/validation';
import { getClientByPhone } from '../utils/bookingService';

export default function BookingForm({ value, onChange, onSubmit }) {
  const [errors, setErrors]       = useState({});
  const [touched, setTouched]     = useState({});
  const [lookingUp, setLookingUp] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const lookupRef = useRef(null);

  const handleChange = (field, val) => {
    onChange({ ...value, [field]: val });
    if (touched[field]) validate({ ...value, [field]: val });
    if (field !== 'phone') setAutoFilled(false);
  };

  const handlePhone = async (e) => {
    const masked = applyPhoneMask(e.target.value);
    handleChange('phone', masked);
    const digits = masked.replace(/\D/g, '');
    if (digits.length >= 11) {
      if (lookupRef.current) clearTimeout(lookupRef.current);
      lookupRef.current = setTimeout(async () => {
        setLookingUp(true);
        setAutoFilled(false);
        try {
          const client = await getClientByPhone(masked);
          if (client) {
            onChange({ ...value, phone: masked, name: client.name || value.name, email: client.email || value.email, notes: client.notes || value.notes, birthdate: client.birthdate || value.birthdate });
            setAutoFilled(true);
          }
        } catch (err) {
          console.error('[BookingForm] getClientByPhone:', err);
        } finally {
          setLookingUp(false);
        }
      }, 400);
    } else {
      setAutoFilled(false);
    }
  };

  const validate = (data = value) => {
    const errs = { name: validateName(data.name), phone: validatePhone(data.phone), email: validateEmail(data.email) };
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleBlur = (field) => {
    setTouched(t => ({ ...t, [field]: true }));
    validate();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ name: true, phone: true, email: true });
    if (validate()) onSubmit();
  };

  const inputCls = (field) =>
    `input-field ${errors[field] && touched[field] ? 'border-red-400 focus:border-red-500' : ''}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-0">

      {/* ── WhatsApp — destaque visual ── */}
      <div className="border-2 border-brand-900 bg-warm-50 p-5 mb-8">
        <label className="flex items-center gap-2 text-sm font-bold text-brand-900 mb-1 tracking-wide uppercase">
          <WaIcon />
          WhatsApp
          <span className="text-gold-500 text-base leading-none">*</span>
          <span className="ml-auto text-xs text-brand-400 font-normal normal-case tracking-normal">Preencha primeiro ↓</span>
        </label>
        <p className="text-xs text-brand-400 mb-3">Vamos completar seus dados automaticamente.</p>
        <div className="relative">
          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" />
          <input
            id="phone"
            type="tel"
            className={`${inputCls('phone')} pl-11 text-base py-4 font-medium`}
            placeholder="(99) 99999-9999"
            value={value.phone}
            onChange={handlePhone}
            onBlur={() => handleBlur('phone')}
            autoComplete="tel"
            autoFocus
          />
        </div>
        {lookingUp && <p className="mt-2 text-xs text-brand-400 animate-pulse">Buscando cadastro...</p>}
        {autoFilled && !lookingUp && (
          <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
            <CheckCircle size={12} /> Cadastro encontrado e preenchido!
          </p>
        )}
        {errors.phone && touched.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
      </div>

      {/* ── Restante dos campos ── */}
      <div className="space-y-5">
        <Field label="Nome Completo" required>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
            <input id="name" type="text" className={`${inputCls('name')} pl-10`}
              placeholder="Seu nome completo" value={value.name}
              onChange={e => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')} autoComplete="name" />
          </div>
          <Error msg={errors.name} show={touched.name} />
        </Field>

        <Field label="Data de Nascimento" optional>
          <div className="relative">
            <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
            <input id="birthdate" type="date" className="input-field pl-10"
              value={value.birthdate || ''}
              onChange={e => handleChange('birthdate', e.target.value)} />
          </div>
        </Field>

        <Field label="E-mail" optional hint="Para receber a confirmação por e-mail">
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
            <input id="email" type="email" className={`${inputCls('email')} pl-10`}
              placeholder="seu@email.com" value={value.email}
              onChange={e => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')} autoComplete="email" />
          </div>
          <Error msg={errors.email} show={touched.email} />
        </Field>

        <Field label="Observações" optional>
          <div className="relative">
            <MessageSquare size={14} className="absolute left-3.5 top-4 text-brand-300" />
            <textarea id="notes" rows={3} className="input-field pl-10 resize-none"
              placeholder="Preferências, referências de corte, etc."
              value={value.notes} onChange={e => handleChange('notes', e.target.value)} />
          </div>
        </Field>
      </div>

      <button type="submit" className="btn-primary w-full mt-6">
        Revisar Agendamento
      </button>
    </form>
  );
}

function Field({ label, required, optional, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-brand-600 mb-2 tracking-widest uppercase">
        {label}
        {required && <span className="text-gold-500 ml-0.5">*</span>}
        {optional && <span className="text-brand-300 ml-1 normal-case">(opcional)</span>}
        {hint && <span className="text-brand-300 ml-1 normal-case font-normal">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Error({ msg, show }) {
  if (!msg || !show) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

function WaIcon() {
  return (
    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

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
      // debounce: cancel previous lookup if still pending
      if (lookupRef.current) clearTimeout(lookupRef.current);
      lookupRef.current = setTimeout(async () => {
        setLookingUp(true);
        setAutoFilled(false);
        try {
          const client = await getClientByPhone(masked);
          if (client) {
            onChange({
              ...value,
              phone:     masked,
              name:      client.name      || value.name,
              email:     client.email     || value.email,
              notes:     client.notes     || value.notes,
              birthdate: client.birthdate || value.birthdate,
            });
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
    const errs = {
      name:  validateName(data.name),
      phone: validatePhone(data.phone),
      email: validateEmail(data.email),
    };
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
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
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* WhatsApp FIRST — triggers auto-fill */}
      <Field label="WhatsApp" required>
        <div className="relative">
          <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
          <input id="phone" type="tel" className={`${inputCls('phone')} pl-10`}
            placeholder="(99) 99999-9999" value={value.phone}
            onChange={handlePhone} onBlur={() => handleBlur('phone')} autoComplete="tel" />
        </div>
        {lookingUp && (
          <p className="mt-1 text-xs text-brand-400 animate-pulse">Buscando cadastro...</p>
        )}
        {autoFilled && !lookingUp && (
          <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
            <CheckCircle size={12} /> Cadastro encontrado e preenchido!
          </p>
        )}
        <Error msg={errors.phone} show={touched.phone} />
      </Field>

      <Field label="Nome Completo" required>
        <div className="relative">
          <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
          <input id="name" type="text" className={`${inputCls('name')} pl-10`}
            placeholder="Seu nome completo" value={value.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')} autoComplete="name" />
        </div>
        <Error msg={errors.name} show={touched.name} />
      </Field>

      <Field label="Data de Nascimento" optional>
        <div className="relative">
          <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
          <input id="birthdate" type="date" className="input-field pl-10"
            value={value.birthdate || ''}
            onChange={(e) => handleChange('birthdate', e.target.value)} />
        </div>
      </Field>

      <Field label="E-mail" optional hint="Para receber a confirmação por e-mail">
        <div className="relative">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
          <input id="email" type="email" className={`${inputCls('email')} pl-10`}
            placeholder="seu@email.com" value={value.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')} autoComplete="email" />
        </div>
        <Error msg={errors.email} show={touched.email} />
      </Field>

      <Field label="Observações" optional>
        <div className="relative">
          <MessageSquare size={14} className="absolute left-3.5 top-4 text-brand-300" />
          <textarea id="notes" rows={3} className="input-field pl-10 resize-none"
            placeholder="Preferências, referências de corte, etc."
            value={value.notes} onChange={(e) => handleChange('notes', e.target.value)} />
        </div>
      </Field>

      <button type="submit" className="btn-primary w-full mt-2">
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
        {hint   && <span className="text-brand-300 ml-1 normal-case font-normal">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Error({ msg, show }) {
  if (!msg || !show) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

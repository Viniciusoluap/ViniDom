import { useState } from 'react';
import { User, Phone, Mail, MessageSquare } from 'lucide-react';
import { validateName, validatePhone, validateEmail, applyPhoneMask } from '../utils/validation';

export default function BookingForm({ value, onChange, onSubmit }) {
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (field, val) => {
    onChange({ ...value, [field]: val });
    if (touched[field]) validate({ ...value, [field]: val });
  };

  const handlePhone = (e) => handleChange('phone', applyPhoneMask(e.target.value));

  const validate = (data = value) => {
    const errs = {
      name:  validateName(data.name),
      phone: validatePhone(data.phone),
      email: validateEmail(data.email),
    };
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleBlur  = (field) => { setTouched((t) => ({ ...t, [field]: true })); validate(); };
  const handleSubmit = (e)  => {
    e.preventDefault();
    setTouched({ name: true, phone: true, email: true });
    if (validate()) onSubmit();
  };

  const inputCls = (field) =>
    `input-field ${errors[field] && touched[field] ? 'border-red-400 focus:border-red-500' : ''}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

      <Field label="WhatsApp" required>
        <div className="relative">
          <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
          <input id="phone" type="tel" className={`${inputCls('phone')} pl-10`}
            placeholder="(99) 99999-9999" value={value.phone}
            onChange={handlePhone} onBlur={() => handleBlur('phone')} autoComplete="tel" />
        </div>
        <Error msg={errors.phone} show={touched.phone} />
      </Field>

      <Field label="E-mail" optional>
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

      <label className="flex items-center gap-3 cursor-pointer group">
        <input type="checkbox"
          className="w-4 h-4 border-brand-300 text-brand-900 focus:ring-brand-900"
          checked={value.whatsappConfirm}
          onChange={(e) => handleChange('whatsappConfirm', e.target.checked)} />
        <span className="text-xs text-brand-500 group-hover:text-brand-900 transition-colors tracking-wide">
          Quero confirmar pelo WhatsApp
        </span>
      </label>

      <button type="submit" className="btn-primary w-full mt-2">
        Revisar Agendamento
      </button>
    </form>
  );
}

function Field({ label, required, optional, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-brand-600 mb-2 tracking-widest uppercase">
        {label}
        {required && <span className="text-gold-500 ml-0.5">*</span>}
        {optional && <span className="text-brand-300 ml-1 normal-case">(opcional)</span>}
      </label>
      {children}
    </div>
  );
}

function Error({ msg, show }) {
  if (!msg || !show) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

import { useState } from 'react';
import { User, Phone, Mail, MessageSquare } from 'lucide-react';
import { validateName, validatePhone, validateEmail, applyPhoneMask } from '../utils/validation';

export default function BookingForm({ value, onChange, onSubmit }) {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (field, val) => {
    onChange({ ...value, [field]: val });
    if (touched[field]) validate({ ...value, [field]: val });
  };

  const handlePhone = (e) => {
    const masked = applyPhoneMask(e.target.value);
    handleChange('phone', masked);
  };

  const validate = (data = value) => {
    const errs = {
      name: validateName(data.name),
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
    `input-field ${errors[field] && touched[field] ? 'border-red-400 focus:ring-red-400' : ''}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="name">
          Nome Completo <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="name"
            type="text"
            className={`${inputCls('name')} pl-10`}
            placeholder="Seu nome completo"
            value={value.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            autoComplete="name"
          />
        </div>
        {errors.name && touched.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="phone">
          WhatsApp <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="phone"
            type="tel"
            className={`${inputCls('phone')} pl-10`}
            placeholder="(99) 99999-9999"
            value={value.phone}
            onChange={handlePhone}
            onBlur={() => handleBlur('phone')}
            autoComplete="tel"
          />
        </div>
        {errors.phone && touched.phone && (
          <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
          E-mail <span className="text-gray-400 text-xs font-normal">(opcional)</span>
        </label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="email"
            type="email"
            className={`${inputCls('email')} pl-10`}
            placeholder="seu@email.com"
            value={value.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            autoComplete="email"
          />
        </div>
        {errors.email && touched.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="notes">
          Observações <span className="text-gray-400 text-xs font-normal">(opcional)</span>
        </label>
        <div className="relative">
          <MessageSquare size={16} className="absolute left-3.5 top-4 text-gray-400" />
          <textarea
            id="notes"
            rows={3}
            className="input-field pl-10 resize-none"
            placeholder="Preferências, referências de corte, etc."
            value={value.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-primary-800 focus:ring-primary-500"
          checked={value.whatsappConfirm}
          onChange={(e) => handleChange('whatsappConfirm', e.target.checked)}
        />
        <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
          Quero confirmar pelo WhatsApp
        </span>
      </label>

      <button type="submit" className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
        Revisar Agendamento
      </button>
    </form>
  );
}

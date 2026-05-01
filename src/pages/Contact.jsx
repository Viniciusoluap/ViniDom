import { MapPin, Phone, Clock } from 'lucide-react';
import { BUSINESS_INFO } from '../utils/constants';
import { buildWhatsAppQuickLink } from '../utils/whatsappFormatter';

function InstagramIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

export default function Contact() {
  return (
    <div className="flex-1 pt-24 pb-16 px-6 max-w-4xl mx-auto w-full animate-fade-in">
      <div className="text-center mb-12">
        <p className="section-subtitle mb-3">Fale Conosco</p>
        <h1 className="section-title text-3xl sm:text-4xl">Contato</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <CCard icon={<Phone size={18} className="text-green-500" />} title="WhatsApp">
            <a href={buildWhatsAppQuickLink()} target="_blank" rel="noopener noreferrer"
              className="text-brand-800 font-semibold hover:text-gold-600 transition-colors text-sm block mb-1">
              {BUSINESS_INFO.phoneDisplay}
            </a>
            <p className="text-brand-400 text-xs mb-4">Atendimento rápido direto no WhatsApp</p>
            <a href={buildWhatsAppQuickLink()} target="_blank" rel="noopener noreferrer"
              className="btn-whatsapp inline-flex items-center gap-2 text-xs py-2.5 px-5">
              <WhatsAppIcon /> Iniciar Conversa
            </a>
          </CCard>

          <CCard icon={<InstagramIcon size={18} className="text-pink-500" />} title="Instagram">
            <a href="https://instagram.com/domconcept" target="_blank" rel="noopener noreferrer"
              className="text-brand-800 font-semibold hover:text-gold-600 transition-colors text-sm block mb-1">
              {BUSINESS_INFO.instagram}
            </a>
            <p className="text-brand-400 text-xs">Acompanhe nossos trabalhos e novidades</p>
          </CCard>

          <CCard icon={<MapPin size={18} className="text-gold-500" />} title="Localização">
            <p className="text-brand-800 font-semibold text-sm mb-1">{BUSINESS_INFO.address}</p>
            <p className="text-brand-400 text-xs">Imperatriz, Maranhão – Brasil</p>
          </CCard>

          <CCard icon={<Clock size={18} className="text-brand-400" />} title="Horários">
            <div className="space-y-2 text-xs">
              {[
                { day: 'Seg, Qua – Sex', hours: '10:00 – 18:00', note: 'Intervalo 12h–14h' },
                { day: 'Sábado',         hours: '10:00 – 18:00', note: 'Intervalo 12h–14h' },
                { day: 'Terça',          hours: 'Fechado', closed: true },
                { day: 'Domingo',        hours: 'Fechado', closed: true },
              ].map(({ day, hours, note, closed }) => (
                <div key={day} className="flex justify-between items-start">
                  <span className="text-brand-500">{day}</span>
                  <div className="text-right">
                    <span className={`font-semibold ${closed ? 'text-red-400' : 'text-brand-800'}`}>{hours}</span>
                    {note && <span className="block text-brand-300 text-xs">{note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CCard>
        </div>

        <div className="bg-white border border-brand-100 p-7 h-fit">
          <h3 className="font-bold text-brand-900 text-sm tracking-widest uppercase mb-1">Envie uma Mensagem</h3>
          <p className="text-brand-400 text-xs mb-6">Para agendamentos, recomendamos o WhatsApp para resposta mais rápida.</p>
          <div className="space-y-4">
            {[
              { id: 'c-name',  label: 'Nome',      type: 'text',  ph: 'Seu nome' },
              { id: 'c-phone', label: 'WhatsApp',   type: 'tel',   ph: '(99) 99999-9999' },
            ].map(({ id, label, type, ph }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-xs font-medium text-brand-400 uppercase tracking-widest mb-1.5">{label}</label>
                <input id={id} type={type} className="input-field" placeholder={ph} />
              </div>
            ))}
            <div>
              <label htmlFor="c-msg" className="block text-xs font-medium text-brand-400 uppercase tracking-widest mb-1.5">Mensagem</label>
              <textarea id="c-msg" rows={4} className="input-field resize-none" placeholder="Como podemos ajudar?" />
            </div>
            <a href={buildWhatsAppQuickLink()} target="_blank" rel="noopener noreferrer"
              className="btn-whatsapp w-full flex items-center justify-center gap-2 py-3.5 font-semibold text-sm">
              <WhatsAppIcon /> Enviar pelo WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function CCard({ icon, title, children }) {
  return (
    <div className="bg-white border border-brand-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-brand-900 text-sm tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

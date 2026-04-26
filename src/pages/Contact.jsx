import { MapPin, Phone, Clock } from 'lucide-react';

function InstagramIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}
import { BUSINESS_INFO } from '../utils/constants';
import { buildWhatsAppQuickLink } from '../utils/whatsappFormatter';

export default function Contact() {
  return (
    <div className="flex-1 py-12 px-4 sm:px-6 max-w-4xl mx-auto w-full animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="section-title text-3xl sm:text-4xl">Contato</h1>
        <p className="section-subtitle">Estamos prontos para te atender</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <ContactCard
            icon={<Phone size={24} className="text-green-500" />}
            title="WhatsApp"
            bg="bg-green-50"
          >
            <a
              href={buildWhatsAppQuickLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 hover:text-green-800 font-semibold transition-colors"
            >
              {BUSINESS_INFO.phoneDisplay}
            </a>
            <p className="text-gray-500 text-sm mt-1">Clique para conversar diretamente no WhatsApp</p>
            <a
              href={buildWhatsAppQuickLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp mt-3 inline-flex items-center gap-2 text-sm py-2 px-4"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Iniciar Conversa
            </a>
          </ContactCard>

          <ContactCard
            icon={<InstagramIcon size={24} className="text-pink-500" />}
            title="Instagram"
            bg="bg-pink-50"
          >
            <a
              href={`https://instagram.com/domconcept`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-700 hover:text-pink-800 font-semibold transition-colors"
            >
              {BUSINESS_INFO.instagram}
            </a>
            <p className="text-gray-500 text-sm mt-1">Veja nossos trabalhos e novidades</p>
          </ContactCard>

          <ContactCard
            icon={<MapPin size={24} className="text-primary-600" />}
            title="Localização"
            bg="bg-primary-50"
          >
            <p className="text-primary-800 font-semibold">{BUSINESS_INFO.address}</p>
            <p className="text-gray-500 text-sm mt-1">Imperatriz, Maranhão – Brasil</p>
          </ContactCard>

          <ContactCard
            icon={<Clock size={24} className="text-gold-500" />}
            title="Horários de Funcionamento"
            bg="bg-yellow-50"
          >
            <div className="space-y-1.5 text-sm">
              {[
                { day: 'Segunda – Sexta', hours: '09:00 – 18:00', note: '(intervalo 13:00–14:00)' },
                { day: 'Sábado', hours: '09:00 – 17:00' },
                { day: 'Domingo', hours: 'Fechado', closed: true },
              ].map(({ day, hours, note, closed }) => (
                <div key={day} className="flex justify-between items-center">
                  <span className="text-gray-600">{day}</span>
                  <div className="text-right">
                    <span className={`font-semibold ${closed ? 'text-red-500' : 'text-gray-800'}`}>{hours}</span>
                    {note && <span className="block text-gray-400 text-xs">{note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </ContactCard>
        </div>

        <div className="card p-6 h-fit">
          <h3 className="font-bold text-primary-800 text-lg mb-4">Envie uma Mensagem</h3>
          <p className="text-gray-500 text-sm mb-6">
            Para agendamentos e dúvidas, utilize o WhatsApp para uma resposta mais rápida.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
              <input type="text" className="input-field" placeholder="Seu nome" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp</label>
              <input type="tel" className="input-field" placeholder="(99) 99999-9999" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensagem</label>
              <textarea rows={4} className="input-field resize-none" placeholder="Como podemos ajudar?" />
            </div>
            <a
              href={buildWhatsAppQuickLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Enviar pelo WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactCard({ icon, title, bg, children }) {
  return (
    <div className={`card p-5 ${bg}`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

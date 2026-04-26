import { Link } from 'react-router-dom';
import { ArrowRight, Award, Heart, Star, Users } from 'lucide-react';
import { BUSINESS_INFO } from '../utils/constants';
import { buildWhatsAppQuickLink } from '../utils/whatsappFormatter';

const VALUES = [
  { icon: <Award size={24} className="text-gold-500" />, title: 'Excelência', desc: 'Cada corte é uma obra de arte. Buscamos a perfeição em cada detalhe.' },
  { icon: <Heart size={24} className="text-red-400" />, title: 'Cuidado', desc: 'Tratamos cada cliente com atenção individual e respeito.' },
  { icon: <Star size={24} className="text-yellow-500" />, title: 'Qualidade', desc: 'Produtos premium e técnicas modernas para o melhor resultado.' },
  { icon: <Users size={24} className="text-primary-600" />, title: 'Comunidade', desc: 'Orgulho de fazer parte da vida dos nossos clientes em Imperatriz.' },
];

export default function About() {
  return (
    <div className="flex-1 animate-fade-in">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-900 to-primary-700 text-white py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-24 h-24 bg-gold-400 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-xl">
            ✂️
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Dom Concept
          </h1>
          <p className="text-xl text-primary-200 leading-relaxed max-w-2xl mx-auto">
            Mais do que um salão, somos um espaço onde estilo e cuidado se encontram.
            Localizado em Imperatriz – MA, o Dom Concept é referência em cortes modernos e atendimento de qualidade.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title mb-4">Nossa História</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  O Dom Concept nasceu da paixão de <strong className="text-primary-800">Vinicius Cavalcante</strong> pelo universo da beleza e estética masculina. Com anos de experiência e dedicação ao ofício, Vinicius criou um espaço único em Imperatriz, onde cada cliente é atendido com atenção personalizada.
                </p>
                <p>
                  Acreditamos que um bom corte vai além da estética – é uma experiência. Por isso investimos em ambiente confortável, produtos de qualidade e técnicas atualizadas para garantir que você saia satisfeito a cada visita.
                </p>
                <p>
                  No Dom Concept, você encontra desde cortes clássicos até os estilos mais modernos, barba impecável e muito mais, tudo com aquele toque especial que só os apaixonados pelo que fazem conseguem entregar.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { num: '500+', label: 'Clientes atendidos' },
                { num: '5★', label: 'Avaliação média' },
                { num: '8+', label: 'Serviços disponíveis' },
                { num: '100%', label: 'Satisfação garantida' },
              ].map(({ num, label }) => (
                <div key={label} className="card p-6 text-center">
                  <div className="text-3xl font-bold text-primary-800 mb-1">{num}</div>
                  <div className="text-gray-500 text-sm">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="section-title">Nossos Valores</h2>
            <p className="section-subtitle">O que nos move todos os dias</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon, title, desc }) => (
              <div key={title} className="card p-6 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  {icon}
                </div>
                <h3 className="font-bold text-primary-800 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 bg-primary-800 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Venha nos Conhecer!</h2>
          <p className="text-primary-200 mb-8">
            Agende seu horário online ou entre em contato pelo WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/agendamento" className="btn-primary bg-gold-400 hover:bg-gold-500 focus:ring-gold-400 flex items-center justify-center gap-2">
              Agendar Agora <ArrowRight size={16} />
            </Link>
            <a
              href={buildWhatsAppQuickLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

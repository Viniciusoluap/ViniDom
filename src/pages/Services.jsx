import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { useServices } from '../hooks/useServices';
import ServiceCard from '../components/ServiceCard';
import { formatPrice, formatDuration } from '../utils/dateFormatter';
import { SERVICES } from '../utils/constants';

export default function Services() {
  const { categories, activeCategory, setActiveCategory, filtered } = useServices();

  return (
    <div className="flex-1 pt-24 pb-16 px-6 max-w-5xl mx-auto w-full animate-fade-in">
      <div className="text-center mb-12">
        <p className="section-subtitle mb-3">Cardápio</p>
        <h1 className="section-title text-3xl sm:text-4xl">Serviços & Preços</h1>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 text-xs tracking-widest uppercase font-medium border transition-all duration-150 ${
              activeCategory === cat
                ? 'bg-brand-900 text-white border-brand-900'
                : 'bg-white text-brand-500 border-brand-200 hover:border-brand-900 hover:text-brand-900'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-brand-100 mb-12">
        {filtered.map((service) => (
          <div key={service.id} className="bg-warm-50 flex flex-col">
            <ServiceCard service={service} />
            <Link to={`/agendamento?servico=${service.id}`}
              className="btn-primary text-xs py-3 text-center flex items-center justify-center gap-2 m-4 mt-0">
              Agendar <ArrowRight size={12} />
            </Link>
          </div>
        ))}
      </div>

      {/* Price Table */}
      <div className="bg-white border border-brand-100 overflow-hidden">
        <div className="bg-brand-900 text-white px-6 py-4">
          <h2 className="font-bold tracking-wide text-sm uppercase">Tabela Completa de Preços</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-warm-50 border-b border-brand-100">
              <tr>
                {['Serviço', 'Categoria', 'Duração', 'Preço', ''].map((h) => (
                  <th key={h} className={`px-5 py-3.5 font-semibold text-brand-400 tracking-widest uppercase ${h === '' || h === 'Duração' || h === 'Preço' ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {SERVICES.map((s) => (
                <tr key={s.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-brand-800">
                    <span className="mr-2">{s.icon}</span>{s.name}
                    {s.popular && <span className="ml-2 text-gold-600 text-xs">★</span>}
                  </td>
                  <td className="px-4 py-4 text-brand-400">{s.category}</td>
                  <td className="px-4 py-4 text-center text-brand-400">
                    <span className="flex items-center justify-center gap-1">
                      <Clock size={11} />{formatDuration(s.duration)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-brand-900">
                    {s.priceLabel && <span className="text-brand-300 font-normal mr-1">{s.priceLabel} </span>}
                    {formatPrice(s.price)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Link to={`/agendamento?servico=${s.id}`}
                      className="text-gold-600 hover:text-gold-700 font-medium hover:underline transition-colors">
                      Agendar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link to="/agendamento" className="btn-primary inline-flex items-center gap-3">
          Fazer Agendamento <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

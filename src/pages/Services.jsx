import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { useServices } from '../hooks/useServices';
import ServiceCard from '../components/ServiceCard';
import { formatPrice, formatDuration } from '../utils/dateFormatter';
import { SERVICES } from '../utils/constants';

export default function Services() {
  const { filtered, categories, activeCategory, setActiveCategory } = useServices();

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="section-title text-3xl sm:text-4xl">Serviços & Preços</h1>
        <p className="section-subtitle">Qualidade profissional em cada atendimento</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 ${
              activeCategory === cat
                ? 'bg-primary-800 text-white border-primary-800'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
        {filtered.map((service) => (
          <div key={service.id} className="flex flex-col">
            <ServiceCard service={service} />
            <Link
              to={`/agendamento?servico=${service.id}`}
              className="mt-2 btn-primary text-sm py-2 text-center flex items-center justify-center gap-1.5"
            >
              Agendar <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>

      {/* Full Price Table */}
      <div className="card overflow-hidden">
        <div className="bg-primary-800 text-white px-6 py-4">
          <h2 className="font-bold text-xl">Tabela de Preços Completa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Serviço</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Categoria</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Duração</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Preço</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SERVICES.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">
                    <span className="mr-2">{s.icon}</span>{s.name}
                    {s.popular && <span className="ml-2 badge bg-gold-400/10 text-gold-600 text-xs">Popular</span>}
                  </td>
                  <td className="px-4 py-4 text-gray-500">{s.category}</td>
                  <td className="px-4 py-4 text-center text-gray-500">
                    <span className="flex items-center justify-center gap-1">
                      <Clock size={13} />{formatDuration(s.duration)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-primary-800">{formatPrice(s.price)}</td>
                  <td className="px-4 py-4 text-center">
                    <Link
                      to={`/agendamento?servico=${s.id}`}
                      className="text-primary-700 hover:text-primary-900 font-medium hover:underline transition-colors text-xs"
                    >
                      Agendar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm mb-4">Prontos para te atender com excelência</p>
        <Link to="/agendamento" className="btn-primary inline-flex items-center gap-2">
          Fazer Agendamento <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { SERVICES, CATEGORIES } from '../utils/constants';

export function useServices() {
  const [activeCategory, setActiveCategory] = useState('Todos');

  const filtered = useMemo(() => {
    if (activeCategory === 'Todos') return SERVICES;
    return SERVICES.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

  return {
    services: SERVICES,
    categories: CATEGORIES,
    filtered,
    activeCategory,
    setActiveCategory,
  };
}

export const BUSINESS_INFO = {
  name: 'Vinicius Cavalcante',
  owner: 'Vinicius Cavalcante',
  phone: '+5599984626896',
  phoneDisplay: '+55 99 98462-6896',
  city: 'Imperatriz-MA',
  instagram: '@domconcept',
  address: 'Imperatriz, Maranhão',
};

// 10h–12h e 14h–18h | Fechado: Terça e Domingo
// Intervalo: 12h–14h (almoço)
export const BUSINESS_HOURS = {
  monday:    { open: '10:00', close: '18:00', lunch: { start: '12:00', end: '14:00' } },
  tuesday:   null,
  wednesday: { open: '10:00', close: '18:00', lunch: { start: '12:00', end: '14:00' } },
  thursday:  { open: '10:00', close: '18:00', lunch: { start: '12:00', end: '14:00' } },
  friday:    { open: '10:00', close: '18:00', lunch: { start: '12:00', end: '14:00' } },
  saturday:  { open: '10:00', close: '18:00', lunch: { start: '12:00', end: '14:00' } },
  sunday:    null,
};

export const SERVICES = [
  {
    id: 1,
    name: 'Corte Masculino',
    category: 'Cortes',
    duration: 30,
    price: 80,
    description: 'Corte moderno com degradê preciso e acabamento impecável.',
    icon: '✂️',
    popular: true,
    priceLabel: null,
  },
  {
    id: 2,
    name: 'Barba',
    category: 'Barba',
    duration: 30,
    price: 80,
    description: 'Aparação e design de barba com navalha e acabamento refinado.',
    icon: '🪒',
    popular: true,
    priceLabel: null,
  },
  {
    id: 3,
    name: 'Botox Capilar',
    category: 'Tratamento',
    duration: 90,
    operationalDuration: 120,
    price: 140,
    description: 'Tratamento de reconstrução e brilho intenso para os fios.',
    icon: '✨',
    popular: false,
    priceLabel: null,
  },
  {
    id: 4,
    name: 'Bumper',
    category: 'Tratamento',
    duration: 90,
    operationalDuration: 120,
    price: 220,
    description: 'Selagem alisante de alto padrão. Preço varia conforme o comprimento.',
    icon: '🌿',
    popular: false,
    priceLabel: 'A partir de',
  },
  {
    id: 5,
    name: 'Detox Capilar',
    category: 'Tratamento',
    duration: 90,
    operationalDuration: 120,
    price: 150,
    description: 'Limpeza profunda dos fios, removendo resíduos e toxinas.',
    icon: '💧',
    popular: false,
    priceLabel: null,
  },
  {
    id: 6,
    name: 'Pigmentação de Barba',
    category: 'Barba',
    duration: 30,
    price: 50,
    description: 'Coloração especializada para uniformizar e dar volume à barba.',
    icon: '🎨',
    popular: false,
    priceLabel: null,
  },
  {
    id: 7,
    name: 'Pintura',
    category: 'Coloração',
    duration: 90,
    operationalDuration: 120,
    price: 250,
    description: 'Coloração completa com produtos premium e resultado duradouro.',
    icon: '🖌️',
    popular: false,
    priceLabel: null,
  },
];

export const CATEGORIES = ['Todos', 'Cortes', 'Barba', 'Coloração', 'Tratamento'];

export const DAY_NAMES_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const SLOT_INTERVAL = 15;

export const CANCELLATION_POLICY = {
  hoursInAdvance: 2,
  text: 'Cancelamentos devem ser feitos com no mínimo 2 horas de antecedência.',
};

export const STAFF = [
  { id: 1, name: 'Vinicius Cavalcante', role: 'Visagista & Hair Expert', color: '#1a1a2e', initials: 'VC' },
];

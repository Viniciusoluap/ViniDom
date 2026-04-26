export const BUSINESS_INFO = {
  name: 'Dom Concept',
  owner: 'Vinicius Cavalcante',
  phone: '+5599984626896',
  phoneDisplay: '+55 99 98462-6896',
  city: 'Imperatriz-MA',
  instagram: '@domconcept',
  address: 'Imperatriz, Maranhão',
};

export const BUSINESS_HOURS = {
  monday:    { open: '09:00', close: '18:00', lunch: { start: '13:00', end: '14:00' } },
  tuesday:   { open: '09:00', close: '18:00', lunch: { start: '13:00', end: '14:00' } },
  wednesday: { open: '09:00', close: '18:00', lunch: { start: '13:00', end: '14:00' } },
  thursday:  { open: '09:00', close: '18:00', lunch: { start: '13:00', end: '14:00' } },
  friday:    { open: '09:00', close: '18:00', lunch: { start: '13:00', end: '14:00' } },
  saturday:  { open: '09:00', close: '17:00', lunch: null },
  sunday:    null,
};

export const SERVICES = [
  {
    id: 1,
    name: 'Corte Degradê',
    category: 'Cortes',
    duration: 30,
    price: 35,
    description: 'Corte moderno com degradê preciso e acabamento impecável.',
    icon: '✂️',
    popular: true,
  },
  {
    id: 2,
    name: 'Corte Navalhado',
    category: 'Cortes',
    duration: 40,
    price: 40,
    description: 'Corte clássico com navalha, contorno definido e textura perfeita.',
    icon: '🪒',
    popular: false,
  },
  {
    id: 3,
    name: 'Barba Aparação',
    category: 'Barba',
    duration: 20,
    price: 20,
    description: 'Aparação e alinhamento da barba com acabamento refinado.',
    icon: '🧔',
    popular: false,
  },
  {
    id: 4,
    name: 'Barba + Desenho',
    category: 'Barba',
    duration: 35,
    price: 35,
    description: 'Aparação completa com desenho personalizado nas bordas.',
    icon: '⚡',
    popular: true,
  },
  {
    id: 5,
    name: 'Pintura Completa',
    category: 'Coloração',
    duration: 120,
    price: 80,
    description: 'Coloração total com produtos premium e resultado duradouro.',
    icon: '🎨',
    popular: false,
  },
  {
    id: 6,
    name: 'Reflexo',
    category: 'Coloração',
    duration: 60,
    price: 50,
    description: 'Reflexo moderno com mechas selecionadas e blend perfeito.',
    icon: '✨',
    popular: false,
  },
  {
    id: 7,
    name: 'Manicure',
    category: 'Complementar',
    duration: 30,
    price: 30,
    description: 'Cuidado completo das unhas com esmaltação de qualidade.',
    icon: '💅',
    popular: false,
  },
  {
    id: 8,
    name: 'Bump (Tratamento)',
    category: 'Tratamento',
    duration: 45,
    price: 45,
    description: 'Tratamento especializado anti-bump para pele sensível.',
    icon: '🌿',
    popular: false,
  },
];

export const CATEGORIES = ['Todos', 'Cortes', 'Barba', 'Coloração', 'Complementar', 'Tratamento'];

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

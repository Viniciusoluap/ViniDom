import { BUSINESS_INFO } from './constants';
import { formatDateLong, formatTime } from './dateFormatter';

export function buildWhatsAppLink({ services, date, time, clientName }) {
  const dateStr     = formatDateLong(date);
  const timeStr     = typeof time === 'number' ? formatTime(time) : time;
  const serviceList = (services || []).map(s => `• ${s.name}`).join('\n');

  const message = [
    `Olá! Gostaria de informar meu agendamento.`,
    ``,
    `*Serviço(s):*`,
    serviceList,
    `*Data:* ${dateStr}`,
    `*Horário:* ${timeStr}`,
    `*Cliente:* ${clientName}`,
    ``,
    `Agendamento confirmado no site. 😊`,
  ].join('\n');

  return `https://wa.me/${BUSINESS_INFO.phone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppQuickLink() {
  const message = encodeURIComponent(`Olá! Gostaria de fazer um agendamento com o Vinicius Cavalcante.`);
  return `https://wa.me/${BUSINESS_INFO.phone}?text=${message}`;
}

import { BUSINESS_INFO } from './constants';
import { formatDateLong, formatTime, parseTimeToMinutes } from './dateFormatter';

export function buildWhatsAppLink({ service, date, time, clientName }) {
  const dateStr = formatDateLong(date);
  const timeStr = typeof time === 'number' ? formatTime(time) : time;

  const message = [
    `Olá! Gostaria de confirmar meu agendamento no Dom Concept.`,
    ``,
    `*Serviço:* ${service.name}`,
    `*Data:* ${dateStr}`,
    `*Horário:* ${timeStr}`,
    `*Cliente:* ${clientName}`,
    ``,
    `Aguardo a confirmação! 😊`,
  ].join('\n');

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${BUSINESS_INFO.phone}?text=${encoded}`;
}

export function buildWhatsAppQuickLink() {
  const message = encodeURIComponent(
    `Olá! Gostaria de fazer um agendamento no Dom Concept.`
  );
  return `https://wa.me/${BUSINESS_INFO.phone}?text=${message}`;
}

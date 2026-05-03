import emailjs from '@emailjs/browser';
import { formatDateLong, formatTime, formatPrice } from './dateFormatter';
import { BUSINESS_INFO } from './constants';

const SVC_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TPL_ID  = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUB_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export async function sendBookingConfirmation({ services, date, timeSlot, totalPrice, client }) {
  if (!SVC_ID || !TPL_ID || !PUB_KEY || !client.email) return;

  try {
    await emailjs.send(SVC_ID, TPL_ID, {
      client_name:  client.name,
      client_email: client.email,
      services:     services.map(s => s.name).join(', '),
      date:         formatDateLong(new Date(date)),
      time:         formatTime(timeSlot),
      total_price:  formatPrice(totalPrice),
      whatsapp:     BUSINESS_INFO.phoneDisplay,
    }, PUB_KEY);
  } catch (err) {
    console.error('[EmailJS]', err);
  }
}

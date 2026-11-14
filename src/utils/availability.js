import { parseTimeToMinutes, getBusinessHoursForDate } from './dateFormatter.js';
import { SLOT_INTERVAL } from './constants.js';
import { getOperationalDuration } from './bookingDuration.js';

export function getAvailableSlots({ date, totalDuration, services = [], bookedSlots = [] }) {
  const operationalDuration = services.length
    ? services.reduce((sum, service) => sum + getOperationalDuration(service), 0)
    : totalDuration;

  if (!date || !totalDuration || !operationalDuration) return [];

  const hours = getBusinessHoursForDate(date);
  if (!hours) return [];

  const open = parseTimeToMinutes(hours.open);
  const close = parseTimeToMinutes(hours.close);
  const lunchStart = hours.lunch ? parseTimeToMinutes(hours.lunch.start) : null;
  const lunchEnd = hours.lunch ? parseTimeToMinutes(hours.lunch.end) : null;
  const slots = [];

  for (let timeSlot = open; timeSlot + operationalDuration <= close; timeSlot += SLOT_INTERVAL) {
    if (lunchStart !== null && timeSlot < lunchEnd && timeSlot + operationalDuration > lunchStart) continue;

    const overlapsBooking = bookedSlots.some((booking) => {
      const bookingEnd = booking.timeSlot + booking.totalDuration;
      return timeSlot < bookingEnd && timeSlot + operationalDuration > booking.timeSlot;
    });

    if (!overlapsBooking) slots.push(timeSlot);
  }

  return slots;
}

export async function loadAvailability({
  date,
  loadDatabaseSlots,
  loadCalendarSlots,
  isCurrent = () => true,
  onStatus = () => {},
}) {
  if (isCurrent()) onStatus({ status: 'loading', slots: [] });
  try {
    const [databaseSlots, calendarSlots] = await Promise.all([
      loadDatabaseSlots(date),
      loadCalendarSlots(date),
    ]);
    if (!isCurrent()) return { status: 'stale', slots: [] };
    const result = { status: 'success', slots: [...databaseSlots, ...calendarSlots] };
    onStatus(result);
    return result;
  } catch {
    if (!isCurrent()) return { status: 'stale', slots: [] };
    const result = { status: 'error', slots: [] };
    onStatus(result);
    return result;
  }
}

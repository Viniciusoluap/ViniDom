import { useMemo } from 'react';
import { parseTimeToMinutes, getBusinessHoursForDate } from '../utils/dateFormatter';
import { SLOT_INTERVAL } from '../utils/constants';
import { getOperationalDuration } from '../utils/bookingDuration';

// bookedSlots: [{ timeSlot, totalDuration }]
export function useAvailableSlots({ date, totalDuration, services = [], bookedSlots = [] }) {
  const operationalDuration = services.length
    ? services.reduce((sum, service) => sum + getOperationalDuration(service), 0)
    : totalDuration;
  return useMemo(() => {
    if (!date || !totalDuration) return [];

    const hours = getBusinessHoursForDate(date);
    if (!hours) return [];

    const open       = parseTimeToMinutes(hours.open);
    const close      = parseTimeToMinutes(hours.close);
    const lunchStart = hours.lunch ? parseTimeToMinutes(hours.lunch.start) : null;
    const lunchEnd   = hours.lunch ? parseTimeToMinutes(hours.lunch.end) : null;

    const slots = [];
    for (let t = open; t + operationalDuration <= close; t += SLOT_INTERVAL) {
      if (lunchStart !== null && t < lunchEnd && t + operationalDuration > lunchStart) continue;

      const isBooked = bookedSlots.some(b => {
        const bEnd = b.timeSlot + b.totalDuration;
        return t < bEnd && t + operationalDuration > b.timeSlot;
      });

      if (!isBooked) slots.push(t);
    }

    return slots;
  }, [date, totalDuration, operationalDuration, bookedSlots]);
}

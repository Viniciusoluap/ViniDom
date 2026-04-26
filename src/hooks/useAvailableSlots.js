import { useMemo } from 'react';
import {
  parseTimeToMinutes,
  getBusinessHoursForDate,
} from '../utils/dateFormatter';
import { SLOT_INTERVAL } from '../utils/constants';

export function useAvailableSlots({ date, service, bookedSlots = [] }) {
  return useMemo(() => {
    if (!date || !service) return [];

    const hours = getBusinessHoursForDate(date);
    if (!hours) return [];

    const open = parseTimeToMinutes(hours.open);
    const close = parseTimeToMinutes(hours.close);
    const lunchStart = hours.lunch ? parseTimeToMinutes(hours.lunch.start) : null;
    const lunchEnd = hours.lunch ? parseTimeToMinutes(hours.lunch.end) : null;

    const slots = [];
    for (let t = open; t + service.duration <= close; t += SLOT_INTERVAL) {
      if (lunchStart !== null && t < lunchEnd && t + service.duration > lunchStart) {
        continue;
      }

      const isBooked = bookedSlots.some((b) => {
        const bStart = b.timeSlot;
        const bEnd = b.timeSlot + b.service.duration;
        return t < bEnd && t + service.duration > bStart;
      });

      if (!isBooked) slots.push(t);
    }

    return slots;
  }, [date, service, bookedSlots]);
}

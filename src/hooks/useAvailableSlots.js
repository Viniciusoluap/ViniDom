import { useMemo } from 'react';
import { getAvailableSlots } from '../utils/availability';

// bookedSlots: [{ timeSlot, totalDuration }]
export function useAvailableSlots({ date, totalDuration, services = [], bookedSlots = [] }) {
  return useMemo(
    () => getAvailableSlots({ date, totalDuration, services, bookedSlots }),
    [date, totalDuration, services, bookedSlots],
  );
}

import { useState, useCallback } from 'react';
import { dateToKey } from '../utils/dateFormatter';

const STORAGE_KEY = 'domconcept_bookings';

function loadBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function useBookings() {
  const [bookings, setBookings] = useState(loadBookings);

  const addBooking = useCallback((booking) => {
    const newBooking = {
      ...booking,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };
    setBookings((prev) => {
      const updated = [...prev, newBooking];
      saveBookings(updated);
      return updated;
    });
    return newBooking;
  }, []);

  const cancelBooking = useCallback((id) => {
    setBookings((prev) => {
      const updated = prev.map((b) =>
        b.id === id ? { ...b, status: 'cancelled' } : b
      );
      saveBookings(updated);
      return updated;
    });
  }, []);

  const getBookingsForDate = useCallback(
    (date) => {
      const key = dateToKey(date);
      return bookings.filter(
        (b) => b.dateKey === key && b.status !== 'cancelled'
      );
    },
    [bookings]
  );

  const getTodayBookings = useCallback(() => {
    const key = dateToKey(new Date());
    return bookings.filter((b) => b.dateKey === key && b.status !== 'cancelled');
  }, [bookings]);

  const getMonthBookings = useCallback((year, month) => {
    return bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      const d = new Date(b.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [bookings]);

  const getMostBookedService = useCallback(() => {
    const counts = {};
    bookings
      .filter((b) => b.status !== 'cancelled')
      .forEach((b) => {
        counts[b.service.name] = (counts[b.service.name] || 0) + 1;
      });
    const entries = Object.entries(counts);
    if (!entries.length) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [bookings]);

  const getUpcoming = useCallback(() => {
    const now = new Date();
    return bookings
      .filter((b) => {
        if (b.status === 'cancelled') return false;
        const d = new Date(b.date);
        d.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
        return d >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.date);
        const db = new Date(b.date);
        da.setHours(Math.floor(a.timeSlot / 60), a.timeSlot % 60, 0, 0);
        db.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
        return da - db;
      })
      .slice(0, 10);
  }, [bookings]);

  return {
    bookings,
    addBooking,
    cancelBooking,
    getBookingsForDate,
    getTodayBookings,
    getMonthBookings,
    getMostBookedService,
    getUpcoming,
  };
}

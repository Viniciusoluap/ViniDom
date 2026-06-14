import { useState, useCallback, useEffect } from 'react';
import {
  getAllBookings,
  cancelBooking as svcCancel,
  updateBookingStatus as svcUpdateStatus,
  updateClientByPhone as svcUpdate,
  deleteClientByPhone as svcDelete,
} from '../utils/bookingService';
import { supabase } from '../lib/supabase';
import { dateToKey } from '../utils/dateFormatter';

export function useBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      getAllBookings().then(data => {
        if (!cancelled) { setBookings(data); setLoading(false); }
      });

    load();

    if (supabase) {
      let pollId = null;

      // Supabase Realtime — atualização instantânea em qualquer mudança na tabela
      const channel = supabase
        .channel('bookings-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          () => { if (!cancelled) getAllBookings().then(data => { if (!cancelled) setBookings(data); }); }
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            // Realtime ativo — polling desnecessário
            if (pollId) { clearInterval(pollId); pollId = null; }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Realtime falhou — inicia polling a cada 10s como fallback
            if (!pollId) {
              pollId = setInterval(() => {
                if (!cancelled) load();
              }, 10000);
            }
          }
        });

      // Keepalive: ping a cada 4 min para evitar pausa do Supabase no plano gratuito
      const keepaliveId = setInterval(() => {
        supabase.from('bookings').select('id').limit(1).then(() => {});
      }, 4 * 60 * 1000);

      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
        clearInterval(keepaliveId);
        if (pollId) clearInterval(pollId);
      };
    }

    // Sem Supabase: localStorage é local, sem necessidade de sync
    return () => { cancelled = true; };
  }, []);

  const cancelBooking = useCallback(async (id) => {
    await svcCancel(id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  }, []);

  const updateBookingStatus = useCallback(async (id, status) => {
    await svcUpdateStatus(id, status);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }, []);

  const getTodayBookings = useCallback(() => {
    const key = dateToKey(new Date());
    return bookings.filter(b => b.dateKey === key && b.status !== 'cancelled');
  }, [bookings]);

  const getMonthBookings = useCallback((year, month) => {
    return bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      const d = new Date(b.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [bookings]);

  const getMostBookedService = useCallback(() => {
    const counts = {};
    bookings
      .filter(b => b.status !== 'cancelled')
      .forEach(b => {
        const list = b.services || (b.service ? [b.service] : []);
        list.forEach(s => { counts[s.name] = (counts[s.name] || 0) + 1; });
      });
    const entries = Object.entries(counts);
    if (!entries.length) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [bookings]);

  const getUpcoming = useCallback(() => {
    const now = new Date();
    return bookings
      .filter(b => {
        if (b.status === 'cancelled') return false;
        const d = new Date(b.date);
        d.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
        return d >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.date); da.setHours(Math.floor(a.timeSlot / 60), a.timeSlot % 60, 0, 0);
        const db = new Date(b.date); db.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
        return da - db;
      })
      .slice(0, 10);
  }, [bookings]);

  const updateClient = useCallback(async (phone, updates) => {
    await svcUpdate(phone, updates);
    const digits = phone.replace(/\D/g, '');
    setBookings(prev => prev.map(b =>
      (b.client?.phone || '').replace(/\D/g, '') === digits
        ? { ...b, client: { ...b.client, ...updates } }
        : b
    ));
  }, []);

  const deleteClient = useCallback(async (phone) => {
    await svcDelete(phone);
    const digits = phone.replace(/\D/g, '');
    setBookings(prev => prev.filter(b => (b.client?.phone || '').replace(/\D/g, '') !== digits));
  }, []);

  return {
    bookings,
    loading,
    cancelBooking,
    updateBookingStatus,
    updateClient,
    deleteClient,
    getTodayBookings,
    getMonthBookings,
    getMostBookedService,
    getUpcoming,
  };
}

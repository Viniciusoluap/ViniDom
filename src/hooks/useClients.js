import { useCallback, useEffect, useState } from 'react';
import { getRegisteredClients, saveClient, deleteClient } from '../utils/clientService';
import { normalizeClientPhone } from '../utils/clientDirectory';

export function useClients(enabled) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try { setClients(await getRegisteredClients()); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [enabled]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!enabled) {
        if (active) { setClients([]); setError(null); setLoading(false); }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getRegisteredClients();
        if (active) setClients(data);
      } catch (err) { if (active) setError(err.message); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [enabled]);

  const save = async (originalPhone, values) => {
    const client = await saveClient(originalPhone, values);
    setClients(prev => [...prev.filter(c => c.id !== client.id && normalizeClientPhone(c.phone) !== normalizeClientPhone(originalPhone)), client]);
    return client;
  };
  const remove = async phone => {
    await deleteClient(phone);
    setClients(prev => prev.filter(c => normalizeClientPhone(c.phone) !== normalizeClientPhone(phone)));
  };
  return { clients, loading, error, reload, save, remove };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client.js';

export function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getDashboardSummary();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useSyncStatus() {
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  // Resultado del sync que el usuario acaba de disparar (para el modal).
  const [lastResult, setLastResult] = useState(null);
  const [triggerError, setTriggerError] = useState(null);
  const watching = useRef(false);

  const poll = useCallback(async () => {
    const s = await api.getSyncStatus();
    setStatus(s);
    setSyncing(s.inProgress);
    // Solo reportamos el resultado de un sync que estábamos siguiendo, no el
    // de la última corrida histórica al montar el componente.
    if (watching.current && !s.inProgress && s.lastSync) {
      watching.current = false;
      setLastResult(s.lastSync);
    }
    return s.inProgress;
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(async () => {
      const inProgress = await poll();
      if (!inProgress) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [poll]);

  const triggerSync = useCallback(async () => {
    setTriggerError(null);
    setLastResult(null);
    setSyncing(true);
    try {
      await api.triggerSync();
    } catch (err) {
      // 409 (ya en curso) o 429 (rate limit) llegan por acá.
      setSyncing(false);
      setTriggerError(err.message);
      return;
    }
    watching.current = true;
    const interval = setInterval(async () => {
      const inProgress = await poll();
      if (!inProgress) clearInterval(interval);
    }, 2000);
  }, [poll]);

  const clearResult = useCallback(() => {
    setLastResult(null);
    setTriggerError(null);
  }, []);

  return { status, syncing, triggerSync, refresh: poll, lastResult, triggerError, clearResult };
}

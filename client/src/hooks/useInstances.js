import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const DEFAULT_FILTERS = {
  engine: '',
  project: '',
  region: '',
  state: '',
  environment: '',
  search: '',
  page: 1,
  limit: 50,
  sortBy: 'instance_name',
  sortDir: 'asc',
};

export function useInstances() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInstances = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getInstances(f);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInstances(filters); }, [filters, fetchInstances]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const setSort = useCallback((sortBy, sortDir) => {
    setFilters((prev) => ({ ...prev, sortBy, sortDir, page: 1 }));
  }, []);

  const refetch = useCallback(() => fetchInstances(filters), [fetchInstances, filters]);

  return { data, loading, error, filters, updateFilter, resetFilters, setSort, refetch };
}

export function useInstanceDatabases(instanceId) {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!instanceId) return;
    setLoading(true);
    api.getInstanceDatabases(instanceId)
      .then(setDatabases)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [instanceId]);

  return { databases, loading };
}

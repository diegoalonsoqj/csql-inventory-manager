import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const DEFAULT_FILTERS = {
  search: '',
  role: '',
  is_active: '',
  page: 1,
  limit: 50,
  sortBy: 'full_name',
  sortDir: 'asc',
};

export function useUsers() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getUsers(f);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(filters); }, [filters, fetchUsers]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
  }, []);

  const setSort = useCallback((sortBy, sortDir) => {
    setFilters((prev) => ({ ...prev, sortBy, sortDir, page: 1 }));
  }, []);

  const refresh = useCallback(() => fetchUsers(filters), [filters, fetchUsers]);

  return { data, loading, error, filters, updateFilter, setSort, refresh };
}

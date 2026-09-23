import { useEffect, useRef, useState } from 'react';
import { Header } from '../components/layout/Header.jsx';
import { ColumnFilters } from '../components/inventory/ColumnFilters.jsx';
import { InstanceTable } from '../components/inventory/InstanceTable.jsx';
import { ExportButton } from '../components/inventory/ExportButton.jsx';
import { useInstances } from '../hooks/useInstances.js';
import { useSyncStatus } from '../hooks/useDashboard.js';
import { api } from '../api/client.js';

export function InventoryPage() {
  const { data, loading, error, filters, updateFilter, setSort, refetch } = useInstances();
  const { syncing } = useSyncStatus();
  const [projects, setProjects] = useState([]);
  const [filterOptions, setFilterOptions] = useState({});
  const prevSyncingRef = useRef(false);

  useEffect(() => {
    api.getProjects().then(setProjects).catch(console.error);
    api.getFilterOptions().then(setFilterOptions).catch(console.error);
  }, []);

  useEffect(() => {
    if (prevSyncingRef.current && !syncing) {
      refetch();
      api.getFilterOptions().then(setFilterOptions).catch(console.error);
    }
    prevSyncingRef.current = syncing;
  }, [syncing, refetch]);

  return (
    <div className="flex flex-col h-full">
      <div className="pt-7 pb-4 shrink-0">
        <Header
          title="Inventario"
          subtitle={data ? `${data.pagination.total} instancias encontradas` : 'Cloud SQL Instances'}
          actions={<ExportButton filters={filters} />}
        />
        <ColumnFilters filters={filters} onFilter={updateFilter} projects={projects} filterOptions={filterOptions} />
      </div>

      <div className="flex-1 min-h-0 pb-7">
        {error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <InstanceTable
            data={data?.data ?? []}
            pagination={data?.pagination}
            loading={loading}
            filters={filters}
            onFilter={updateFilter}
            onSort={setSort}
          />
        )}
      </div>
    </div>
  );
}

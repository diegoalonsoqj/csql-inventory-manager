import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatDate, ENGINE_COLORS, STATE_COLORS } from '../../lib/utils.js';
import { DatabaseDrawer } from './DatabaseDrawer.jsx';

const col = createColumnHelper();

function StateBadge({ state }) {
  const color = STATE_COLORS[state] ?? '#6b7280';
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
      {state}
    </span>
  );
}

function EngineBadge({ engine }) {
  const color = ENGINE_COLORS[engine] ?? '#6b7280';
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}22` }}
    >
      {engine}
    </span>
  );
}

const COLUMNS = [
  col.accessor('instance_name', {
    header: 'Instancia',
    cell: (info) => (
      <span className="font-mono text-sm text-fg">{info.getValue()}</span>
    ),
  }),
  col.accessor('project_id', {
    header: 'Proyecto',
    cell: (info) => <span className="font-mono text-xs text-fg/60">{info.getValue()}</span>,
  }),
  col.accessor('engine', {
    header: 'Engine',
    cell: (info) => <EngineBadge engine={info.getValue()} />,
  }),
  col.accessor('environment', {
    header: 'Ambiente',
    cell: (info) => (
      <span className="text-xs text-fg/50">{info.getValue() ?? '—'}</span>
    ),
  }),
  col.accessor('ip_primary', {
    header: 'IP',
    cell: (info) => {
      const ip = info.getValue()
        ?? (info.row.original.ip_label ? info.row.original.ip_label.replace(/-/g, '.') : null);
      return <span className="font-mono text-xs text-fg/40">{ip ?? '—'}</span>;
    },
  }),
  col.accessor('state', {
    header: 'Estado',
    cell: (info) => <StateBadge state={info.getValue()} />,
  }),
];

function SortIcon({ column, sortBy, sortDir }) {
  if (column !== sortBy) return <ChevronsUpDown size={12} className="text-fg/20" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-accent" />
    : <ChevronDown size={12} className="text-accent" />;
}

const SORTABLE = ['instance_name', 'project_id', 'state', 'engine'];

export function InstanceTable({ data = [], pagination, loading, filters, onFilter, onSort }) {
  const [selectedInstance, setSelectedInstance] = useState(null);

  const table = useReactTable({
    data: data,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: pagination?.totalPages ?? 0,
  });

  const handleHeaderClick = (columnId) => {
    if (!SORTABLE.includes(columnId)) return;
    if (filters.sortBy === columnId) {
      onSort(columnId, filters.sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(columnId, 'asc');
    }
  };

  return (
    <>
      <div className="flex flex-col bg-surface-card border border-surface-border rounded-xl overflow-hidden h-full">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-surface-border">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={() => handleHeaderClick(header.column.id)}
                      className={cn(
                        'bg-surface-card px-4 py-3 text-xs font-medium text-fg/40 uppercase tracking-wider whitespace-nowrap',
                        SORTABLE.includes(header.column.id) && 'cursor-pointer hover:text-fg/70 select-none'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {SORTABLE.includes(header.column.id) && (
                          <SortIcon column={header.column.id} sortBy={filters.sortBy} sortDir={filters.sortDir} />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-sm text-fg/30">
                    Cargando…
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-sm text-fg/30">
                    No se encontraron instancias
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedInstance(row.original)}
                    className={cn(
                      'border-b border-surface-border/50 cursor-pointer transition-colors duration-100',
                      i % 2 === 0 ? 'bg-transparent' : 'bg-surface/30',
                      'hover:bg-accent-muted'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border shrink-0">
            <p className="text-xs text-fg/30">
              {pagination.total} instancias — página {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onFilter('page', pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg text-fg/40 hover:text-fg hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => onFilter('page', pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg text-fg/40 hover:text-fg hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedInstance && (
        <DatabaseDrawer
          instance={selectedInstance}
          onClose={() => setSelectedInstance(null)}
        />
      )}
    </>
  );
}

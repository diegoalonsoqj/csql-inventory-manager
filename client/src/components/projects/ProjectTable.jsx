import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Power } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils.js';

const col = createColumnHelper();

function ActiveBadge({ isActive }) {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium',
        isActive ? 'text-success' : 'text-fg/30'
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full inline-block', isActive ? 'bg-success' : 'bg-fg/20')}
      />
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  );
}

const SORTABLE = ['project_name', 'project_id', 'created_at'];

function SortIcon({ column, sortBy, sortDir }) {
  if (column !== sortBy) return <ChevronsUpDown size={12} className="text-fg/20" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-accent" />
    : <ChevronDown size={12} className="text-accent" />;
}

export function ProjectTable({ data = [], pagination, loading, filters, onFilter, onSort, onToggle, canManage = true }) {
  const COLUMNS = [
    col.accessor('project_name', {
      header: 'Nombre',
      cell: (info) => <span className="text-sm font-medium text-fg">{info.getValue()}</span>,
    }),
    col.accessor('project_id', {
      header: 'Project ID',
      cell: (info) => <span className="font-mono text-xs text-fg/60">{info.getValue()}</span>,
    }),
    col.accessor('is_active', {
      header: 'Estado',
      cell: (info) => <ActiveBadge isActive={info.getValue()} />,
    }),
    col.accessor('created_at', {
      header: 'Creado',
      cell: (info) => <span className="text-xs text-fg/40">{formatDate(info.getValue())}</span>,
    }),
    ...(canManage ? [col.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(info.row.original.project_id); }}
          title={info.row.original.is_active ? 'Desactivar proyecto' : 'Activar proyecto'}
          className={cn(
            'p-1.5 rounded-lg transition-colors duration-100',
            info.row.original.is_active
              ? 'text-fg/30 hover:text-danger hover:bg-danger/10'
              : 'text-fg/30 hover:text-success hover:bg-success/10'
          )}
        >
          <Power size={14} />
        </button>
      ),
    })] : []),
  ];

  const table = useReactTable({
    data,
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
                  No se encontraron proyectos
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-surface-border/50 transition-colors duration-100',
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
            {pagination.total} proyectos — página {pagination.page} de {pagination.totalPages}
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
  );
}

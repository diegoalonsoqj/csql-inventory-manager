import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils.js';

function Select({ value, onChange, placeholder, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-surface border border-surface-border text-sm text-fg/80 rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50 min-w-[130px]"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value ?? opt} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  );
}

export function ColumnFilters({ filters, onFilter, projects = [], filterOptions = {} }) {
  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => !['page', 'limit', 'sortBy', 'sortDir'].includes(k) && v
  );

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/30" />
        <input
          type="text"
          placeholder="Buscar instancia, base de datos, IP, aplicación, host…"
          value={filters.search}
          onChange={(e) => onFilter('search', e.target.value)}
          className="w-full bg-surface border border-surface-border text-sm text-fg/80 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-accent/50"
        />
      </div>

      <Select
        value={filters.engine}
        onChange={(v) => onFilter('engine', v)}
        placeholder="Engine"
        options={['PostgreSQL', 'MySQL', 'SQL Server']}
      />

      <Select
        value={filters.project}
        onChange={(v) => onFilter('project', v)}
        placeholder="Proyecto"
        options={projects.map((p) => ({ value: p.project_id, label: p.project_name ?? p.project_id }))}
      />

      <Select
        value={filters.state}
        onChange={(v) => onFilter('state', v)}
        placeholder="Estado"
        options={['RUNNABLE', 'STOPPED', 'SUSPENDED', 'MAINTENANCE', 'PENDING_CREATE', 'PENDING_DELETE', 'FAILED', 'DELETED']}
      />

      <Select
        value={filters.environment}
        onChange={(v) => onFilter('environment', v)}
        placeholder="Ambiente"
        options={filterOptions.environments ?? []}
      />

      {hasActiveFilters && (
        <button
          onClick={() => {
            ['search', 'engine', 'project', 'state', 'environment', 'region'].forEach((k) => onFilter(k, ''));
          }}
          className="flex items-center gap-1.5 text-xs text-fg/40 hover:text-fg/70 transition-colors"
        >
          <X size={12} />
          Limpiar
        </button>
      )}
    </div>
  );
}

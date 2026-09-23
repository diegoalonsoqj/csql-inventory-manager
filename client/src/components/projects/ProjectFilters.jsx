import { Search, X } from 'lucide-react';

function Select({ value, onChange, placeholder, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-surface border border-surface-border text-sm text-white/80 rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50 min-w-[130px]"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function ProjectFilters({ filters, onFilter }) {
  const hasActiveFilters = filters.search || filters.is_active;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Buscar proyecto…"
          value={filters.search}
          onChange={(e) => onFilter('search', e.target.value)}
          className="w-full bg-surface border border-surface-border text-sm text-white/80 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-accent/50"
        />
      </div>

      <Select
        value={filters.is_active}
        onChange={(v) => onFilter('is_active', v)}
        placeholder="Estado"
        options={[
          { value: 'true', label: 'Activo' },
          { value: 'false', label: 'Inactivo' },
        ]}
      />

      {hasActiveFilters && (
        <button
          onClick={() => { onFilter('search', ''); onFilter('is_active', ''); }}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <X size={12} />
          Limpiar
        </button>
      )}
    </div>
  );
}

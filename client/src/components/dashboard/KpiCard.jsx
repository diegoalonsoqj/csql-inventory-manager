import { cn } from '../../lib/utils.js';

export function KpiCard({ title, value, subtitle, icon: Icon, accent = false }) {
  return (
    <div
      className={cn(
        'bg-surface-card border border-surface-border rounded-xl p-5 animate-fade-in',
        accent && 'border-accent/30'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{title}</p>
          <p className={cn('text-3xl font-bold mt-2', accent ? 'text-accent' : 'text-white')}>
            {value ?? '—'}
          </p>
          {subtitle && <p className="text-xs text-white/30 mt-1.5">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('p-2.5 rounded-lg', accent ? 'bg-accent-muted' : 'bg-surface')}>
            <Icon size={20} className={accent ? 'text-accent' : 'text-white/40'} />
          </div>
        )}
      </div>
    </div>
  );
}

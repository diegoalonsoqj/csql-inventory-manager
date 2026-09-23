import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Zona horaria activa de la app (configurable en Settings). undefined = la del
// navegador. Se establece con setAppTimezone() al cargar la app.
let appTimezone;

export function setAppTimezone(tz) {
  appTimezone = tz || undefined;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: appTimezone,
  }).format(new Date(dateStr));
}

export function formatDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export const ENGINE_COLORS = {
  PostgreSQL: '#06b6d4',
  MySQL: '#f59e0b',
  'SQL Server': '#8b5cf6',
  Unknown: '#6b7280',
};

export const STATE_COLORS = {
  RUNNABLE: '#22c55e',
  STOPPED: '#ef4444',
  MAINTENANCE: '#f59e0b',
  DELETED: '#6b7280',
};

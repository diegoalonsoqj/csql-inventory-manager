import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, RefreshCw, ChevronLeft, ChevronRight, FolderOpen, Users, LogOut, Settings, AlertTriangle } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils.js';
import { useSyncStatus } from '../../hooks/useDashboard.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { SyncResultModal } from '../sync/SyncResultModal.jsx';

function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
          collapsed ? 'justify-center' : '',
          isActive
            ? 'bg-accent-muted text-accent border border-accent/20'
            : 'text-white/60 hover:text-white hover:bg-surface-hover'
        )
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export function Sidebar({ collapsed, onToggle }) {
  const { status, syncing, triggerSync, lastResult, triggerError, clearResult } = useSyncStatus();
  const { user, isAdmin, canSync, logout } = useAuth();
  const [modalResult, setModalResult] = useState(null);

  // Al terminar un sync que el usuario disparó, se abre el modal si hubo
  // cualquier problema; si salió limpio, basta con el estado del sidebar.
  useEffect(() => {
    if (lastResult && lastResult.status !== 'success') setModalResult(lastResult);
  }, [lastResult]);

  const closeModal = () => { setModalResult(null); clearResult(); };

  const initials = (user?.full_name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const ROLE_LABELS = { admin: 'Admin', operator: 'Operator', viewer: 'Viewer' };
  const roleLabel = ROLE_LABELS[user?.role] ?? 'Viewer';

  const lastSync = status?.lastSync;
  const failedCount = Array.isArray(lastSync?.failed_projects) ? lastSync.failed_projects.length : 0;

  const syncStatusColor = syncing
    ? 'text-yellow-400'
    : lastSync?.status === 'success'
    ? 'text-green-400'
    : lastSync?.status === 'partial'
    ? 'text-yellow-400'
    : lastSync?.status === 'failed'
    ? 'text-red-400'
    : 'text-white/40';

  const STATUS_LABELS = {
    running: 'En progreso',
    success: 'success',
    partial: 'parcial',
    failed: 'failed',
  };

  return (
    // El aside recorta su contenido (overflow-hidden) durante la animación de
    // ancho; el botón de contraer va fuera de él para poder montarse sobre el borde.
    <div className="relative h-full shrink-0 z-20">
      <aside
        className={cn(
          'h-full bg-surface-card border-r border-surface-border flex flex-col shrink-0 transition-[width] duration-200 overflow-hidden',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className={cn('border-b border-surface-border flex items-center', collapsed ? 'px-0 py-5 justify-center' : 'px-5 py-5')}>
          <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
            <Database size={16} className="text-accent" />
          </div>
          {!collapsed && (
            <div className="ml-2.5 overflow-hidden">
              <p className="text-sm font-semibold text-white whitespace-nowrap">CSQL Inventory</p>
              <p className="text-xs text-white/40">Google Cloud SQL</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
          <NavItem to="/inventory" icon={Database} label="Inventario" collapsed={collapsed} />
          <NavItem to="/projects" icon={FolderOpen} label="Proyectos" collapsed={collapsed} />
          {isAdmin && <NavItem to="/users" icon={Users} label="Usuarios" collapsed={collapsed} />}
          {isAdmin && <NavItem to="/settings" icon={Settings} label="Configuración" collapsed={collapsed} />}
        </nav>

        {/* Sync + toggle */}
        <div className="px-3 py-4 border-t border-surface-border space-y-2">
          {canSync && (
            <button
              onClick={triggerSync}
              disabled={syncing}
              title={collapsed ? (syncing ? 'Sincronizando…' : 'Sync GCP') : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center' : '',
                syncing
                  ? 'text-yellow-400 bg-yellow-400/10 cursor-not-allowed'
                  : 'text-white/60 hover:text-white hover:bg-surface-hover'
              )}
            >
              <RefreshCw size={18} className={cn('shrink-0', syncing ? 'animate-spin' : '')} />
              {!collapsed && (syncing ? 'Sincronizando…' : 'Sync GCP')}
            </button>
          )}

          {!collapsed && lastSync && (
            <button
              onClick={() => setModalResult(lastSync)}
              title="Ver detalle de la última sincronización"
              className="w-full text-left px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
            >
              <p className="text-xs text-white/30 mb-0.5">Último sync</p>
              <p className={cn('text-xs font-medium flex items-center gap-1.5', syncStatusColor)}>
                {failedCount > 0 && <AlertTriangle size={12} className="shrink-0" />}
                {STATUS_LABELS[lastSync.status] ?? lastSync.status}
                {failedCount > 0 && (
                  <span className="text-white/40 font-normal">
                    · {failedCount} proyecto{failedCount === 1 ? '' : 's'}
                  </span>
                )}
              </p>
              <p className="text-xs text-white/30 mt-0.5">
              {formatDate(lastSync.started_at)}
              {lastSync.triggered_by === 'auto' && ' · automático'}
            </p>
            </button>
          )}

          {/* Usuario actual + logout */}
          <div className={cn('flex items-center gap-2.5 px-1 py-1', collapsed ? 'justify-center' : '')}>
            <div
              title={collapsed ? `${user?.full_name} — Cerrar sesión` : undefined}
              className="w-8 h-8 rounded-full bg-accent-muted text-accent text-xs font-semibold flex items-center justify-center shrink-0"
            >
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80 truncate">{user?.full_name}</p>
                  <p className="text-[11px] text-white/30 truncate">{roleLabel}</p>
                </div>
                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>
          {collapsed && (
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="w-full flex justify-center p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>

        {(modalResult || triggerError) && (
          <SyncResultModal result={modalResult} triggerError={triggerError} onClose={closeModal} />
        )}
      </aside>

      {/* Toggle collapse: círculo sobre el borde, a la altura del logo. */}
      <button
        onClick={onToggle}
        title={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
        aria-label={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
        className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-surface-card border border-surface-border flex items-center justify-center text-white/40 hover:text-accent hover:border-accent/40 shadow-md transition-colors duration-150"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
}

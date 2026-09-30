import { useState } from 'react';
import { Plus, Pencil, KeyRound, UserX, UserCheck, Search, ChevronLeft, ChevronRight, ShieldCheck, Eye, Wrench, Network } from 'lucide-react';
import { Header } from '../components/layout/Header.jsx';
import { UserModal } from '../components/users/UserModal.jsx';
import { ResetPasswordModal } from '../components/users/ResetPasswordModal.jsx';
import { useUsers } from '../hooks/useUsers.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { cn, formatDate } from '../lib/utils.js';

const ROLE_META = {
  admin: { label: 'Admin', icon: ShieldCheck, cls: 'text-accent bg-accent-muted' },
  operator: { label: 'Operator', icon: Wrench, cls: 'text-amber-400 bg-amber-400/10' },
  viewer: { label: 'Viewer', icon: Eye, cls: 'text-white/50 bg-white/5' },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] ?? ROLE_META.viewer;
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md', meta.cls)}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function AuthTypeBadge({ user }) {
  if (user.auth_type === 'ad') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
        <Network size={12} className="text-accent" />
        AD · <span className="font-mono">{user.ad_username}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
      <KeyRound size={12} />
      Local
    </span>
  );
}

function ActiveBadge({ isActive }) {
  return (
    <span className={cn('flex items-center gap-1.5 text-xs font-medium', isActive ? 'text-green-400' : 'text-white/30')}>
      <span className={cn('w-1.5 h-1.5 rounded-full inline-block', isActive ? 'bg-green-400' : 'bg-white/20')} />
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { data, loading, error, filters, updateFilter, refresh } = useUsers();
  const [editing, setEditing] = useState(null);   // usuario a editar o {} para nuevo
  const [resetting, setResetting] = useState(null);
  const [actionError, setActionError] = useState('');

  const users = data?.data ?? [];
  const pagination = data?.pagination;

  const handleToggleActive = async (u) => {
    setActionError('');
    try {
      if (u.is_active) {
        await api.deactivateUser(u.id);
      } else {
        await api.updateUser(u.id, { is_active: true });
      }
      refresh();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="pt-7 pb-4 shrink-0">
        <Header
          title="Usuarios"
          subtitle={pagination ? `${pagination.total} usuarios registrados` : 'Gestión de usuarios y accesos'}
          actions={
            <button
              onClick={() => setEditing({})}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-surface text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
            >
              <Plus size={15} />
              Nuevo usuario
            </button>
          }
        />

        {/* Filtros */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o usuario…"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full bg-surface-card border border-surface-border text-sm text-white/80 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-accent/50 placeholder:text-white/20"
            />
          </div>
          <select
            value={filters.role}
            onChange={(e) => updateFilter('role', e.target.value)}
            className="bg-surface-card border border-surface-border text-sm text-white/70 rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
          >
            <option value="">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </select>
          <select
            value={filters.auth_type}
            onChange={(e) => updateFilter('auth_type', e.target.value)}
            className="bg-surface-card border border-surface-border text-sm text-white/70 rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
          >
            <option value="">Todos los tipos</option>
            <option value="ad">Active Directory</option>
            <option value="local">Local</option>
          </select>
          <select
            value={filters.is_active}
            onChange={(e) => updateFilter('is_active', e.target.value)}
            className="bg-surface-card border border-surface-border text-sm text-white/70 rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        {actionError && <p className="text-xs text-red-400 mt-2">{actionError}</p>}
      </div>

      <div className="flex-1 min-h-0 pb-7">
        {error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <div className="flex flex-col bg-surface-card border border-surface-border rounded-xl overflow-hidden h-full">
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-surface-border">
                    {['Nombre', 'Tipo', 'Correo', 'Rol', 'Estado', 'Último ingreso', ''].map((h, i) => (
                      <th key={i} className="bg-surface-card px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">Cargando…</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">No se encontraron usuarios</td></tr>
                  ) : (
                    users.map((u, i) => (
                      <tr
                        key={u.id}
                        className={cn(
                          'border-b border-surface-border/50 transition-colors duration-100',
                          i % 2 === 0 ? 'bg-transparent' : 'bg-surface/30',
                          'hover:bg-accent-muted'
                        )}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-white">{u.full_name}</span>
                          {u.id === currentUser.id && <span className="ml-2 text-xs text-white/30">(tú)</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><AuthTypeBadge user={u} /></td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-white/60">{u.email ?? <span className="text-white/20">—</span>}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3 whitespace-nowrap"><ActiveBadge isActive={u.is_active} /></td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-white/40">{formatDate(u.last_login_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditing(u)}
                              title="Editar"
                              className="p-1.5 rounded-lg text-white/30 hover:text-accent hover:bg-accent/10 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            {/* Los usuarios AD cambian su contraseña en el dominio. */}
                            {u.auth_type !== 'ad' && (
                              <button
                                onClick={() => setResetting(u)}
                                title="Restablecer contraseña"
                                className="p-1.5 rounded-lg text-white/30 hover:text-accent hover:bg-accent/10 transition-colors"
                              >
                                <KeyRound size={14} />
                              </button>
                            )}
                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => handleToggleActive(u)}
                                title={u.is_active ? 'Desactivar' : 'Reactivar'}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  u.is_active
                                    ? 'text-white/30 hover:text-red-400 hover:bg-red-400/10'
                                    : 'text-white/30 hover:text-green-400 hover:bg-green-400/10'
                                )}
                              >
                                {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border shrink-0">
                <p className="text-xs text-white/30">
                  {pagination.total} usuarios — página {pagination.page} de {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateFilter('page', pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => updateFilter('page', pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <UserModal
          user={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
        />
      )}
    </div>
  );
}

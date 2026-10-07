import { useState } from 'react';
import { X, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../api/client.js';

export function DeleteUserModal({ user, onClose, onDeleted }) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const identifier = user.auth_type === 'ad' ? user.ad_username : user.email;

  const handleDelete = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.deleteUser(user.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2 min-w-0">
            <Trash2 size={16} className="text-danger shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-fg">Eliminar usuario</h2>
              <p className="text-xs text-fg/40 mt-0.5 truncate font-mono">{identifier}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-fg/40 hover:text-fg hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-fg/70">
            ¿Eliminar a <span className="font-medium text-fg">{user.full_name}</span>? Perderá el acceso
            de inmediato y el usuario se borrará definitivamente. Esta acción no se puede deshacer.
          </p>
          {user.is_active && (
            <p className="text-xs text-fg/40">
              Si solo quieres quitarle el acceso temporalmente, usa <span className="text-fg/60">Desactivar</span>.
            </p>
          )}

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-fg/50 hover:text-fg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

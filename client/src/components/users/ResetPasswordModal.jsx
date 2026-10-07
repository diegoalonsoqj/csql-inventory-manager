import { useState } from 'react';
import { X, Loader2, KeyRound } from 'lucide-react';
import { api } from '../../api/client.js';

export function ResetPasswordModal({ user, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Mínimo 8 caracteres'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.resetUserPassword(user.id, password);
      setDone(true);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-accent" />
            <div>
              <h2 className="text-base font-semibold text-fg">Restablecer contraseña</h2>
              <p className="text-xs text-fg/40 mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg/40 hover:text-fg hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-6">
            <p className="text-sm text-success mb-4">
              Contraseña actualizada. Comparte la nueva contraseña con el usuario por un canal seguro.
            </p>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-accent text-on-accent text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-fg/60 mb-1.5">Nueva contraseña</label>
              <input
                type="text"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-surface border border-surface-border text-sm font-mono text-fg/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-fg/20"
              />
              {error && <p className="text-xs text-danger mt-1">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-fg/50 hover:text-fg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-on-accent text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Restablecer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

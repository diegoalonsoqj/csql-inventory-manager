import { useState } from 'react';
import { Database, Loader2, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.username.trim(), form.password);
      // El cambio de estado en AuthContext hace que App renderice la app.
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface font-sans px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center mb-3">
            <Database size={24} className="text-accent" />
          </div>
          <h1 className="text-lg font-semibold text-fg">CSQL Inventory</h1>
          <p className="text-sm text-fg/40">Google Cloud SQL</p>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-xl shadow-2xl px-6 py-7">
          <h2 className="text-base font-semibold text-fg mb-1">Iniciar sesión</h2>
          <p className="text-xs text-fg/40 mb-5">Usa tu usuario de red (AD) o tu correo si tienes cuenta local</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-fg/60 mb-1.5">Usuario o correo</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/25" />
                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="usuario de red o correo"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="w-full bg-surface border border-surface-border text-sm text-fg/80 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-fg/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-fg/60 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/25" />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full bg-surface border border-surface-border text-sm text-fg/80 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-fg/20"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-on-accent text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

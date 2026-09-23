import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../api/client.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    email: user?.email ?? '',
    full_name: user?.full_name ?? '',
    role: user?.role ?? 'viewer',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'El nombre es obligatorio';
    if (!isEdit) {
      if (!form.email.trim()) e.email = 'El correo es obligatorio';
      else if (!EMAIL_REGEX.test(form.email)) e.email = 'Correo inválido';
      if (!form.password) e.password = 'La contraseña es obligatoria';
      else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setServerError('');
    try {
      if (isEdit) {
        await api.updateUser(user.id, {
          full_name: form.full_name,
          role: form.role,
        });
      } else {
        await api.createUser(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const inputCls =
    'w-full bg-surface border border-surface-border text-sm text-white/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-white/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-base font-semibold text-white">
              {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              {isEdit ? user.email : 'Se creará con acceso inmediato'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Nombre completo</label>
            <input
              type="text"
              placeholder="Juan Pérez"
              value={form.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className={inputCls}
            />
            {errors.full_name && <p className="text-xs text-red-400 mt-1">{errors.full_name}</p>}
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Correo</label>
                <input
                  type="email"
                  placeholder="usuario@example.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`${inputCls} font-mono`}
                />
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Contraseña temporal
                </label>
                <input
                  type="text"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`${inputCls} font-mono`}
                />
                {errors.password ? (
                  <p className="text-xs text-red-400 mt-1">{errors.password}</p>
                ) : (
                  <p className="text-xs text-white/30 mt-1">
                    El usuario debería cambiarla en su primer ingreso.
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Rol</label>
            <select
              value={form.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className={inputCls}
            >
              <option value="viewer">Viewer — solo lectura + exportar</option>
              <option value="operator">Operator — gestiona proyectos, sync y export</option>
              <option value="admin">Admin — control total</option>
            </select>
          </div>

          {serverError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-red-400">{serverError}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-surface text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

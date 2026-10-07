import { useState } from 'react';
import { X, Loader2, KeyRound, Network } from 'lucide-react';
import { api } from '../../api/client.js';
import { cn } from '../../lib/utils.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AD_USERNAME_REGEX = /^[a-zA-Z0-9._-]{1,64}$/;

const AUTH_TYPES = [
  { value: 'ad', label: 'Active Directory', icon: Network, hint: 'Entra con su usuario y contraseña de red' },
  { value: 'local', label: 'Local', icon: KeyRound, hint: 'Entra con correo y una contraseña de la app' },
];

// Acepta "INTERSEGURO\jperez" pegado desde otro lado y se queda con "jperez".
const stripDomain = (v) => v.slice(v.lastIndexOf('\\') + 1);

export function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    auth_type: user?.auth_type ?? 'ad',
    ad_username: user?.ad_username ?? '',
    email: user?.email ?? '',
    full_name: user?.full_name ?? '',
    role: user?.role ?? 'viewer',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const isAd = form.auth_type === 'ad';

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'El nombre es obligatorio';
    if (isAd) {
      if (!form.ad_username.trim()) e.ad_username = 'El usuario de red es obligatorio';
      else if (!AD_USERNAME_REGEX.test(form.ad_username.trim())) e.ad_username = 'Solo letras, dígitos, punto, guion y guion bajo';
      if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) e.email = 'Correo inválido';
    } else {
      if (!form.email.trim()) e.email = 'El correo es obligatorio';
      else if (!EMAIL_REGEX.test(form.email.trim())) e.email = 'Correo inválido';
      if (!isEdit) {
        if (!form.password) e.password = 'La contraseña es obligatoria';
        else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
      }
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
          email: form.email.trim(),
          ...(isAd && { ad_username: form.ad_username.trim() }),
        });
      } else if (isAd) {
        await api.createUser({
          auth_type: 'ad',
          ad_username: form.ad_username.trim(),
          email: form.email.trim(),
          full_name: form.full_name,
          role: form.role,
        });
      } else {
        await api.createUser({
          auth_type: 'local',
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          password: form.password,
        });
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
    'w-full bg-surface border border-surface-border text-sm text-fg/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-fg/20';

  const subtitle = isEdit
    ? (isAd ? `Active Directory · ${user.ad_username}` : user.email)
    : 'Se creará con acceso inmediato';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">
              {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <p className="text-xs text-fg/40 mt-0.5 truncate">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg/40 hover:text-fg hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Tipo de usuario: solo al crear (no se convierte un usuario existente). */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-fg/60 mb-1.5">Tipo de usuario</label>
              <div className="grid grid-cols-2 gap-2">
                {AUTH_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { handleChange('auth_type', value); setErrors({}); }}
                    className={cn(
                      'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                      form.auth_type === value
                        ? 'border-accent/40 bg-accent-muted text-accent'
                        : 'border-surface-border text-fg/50 hover:text-fg hover:bg-surface-hover'
                    )}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-fg/30 mt-1.5">
                {AUTH_TYPES.find((t) => t.value === form.auth_type).hint}
              </p>
            </div>
          )}

          {isAd && (
            <div>
              <label className="block text-xs font-medium text-fg/60 mb-1.5">Usuario de red</label>
              <input
                type="text"
                placeholder="jperez"
                autoCapitalize="none"
                spellCheck={false}
                value={form.ad_username}
                onChange={(e) => handleChange('ad_username', stripDomain(e.target.value))}
                className={`${inputCls} font-mono`}
              />
              {errors.ad_username ? (
                <p className="text-xs text-danger mt-1">{errors.ad_username}</p>
              ) : (
                <p className="text-xs text-fg/30 mt-1">El mismo con el que entra a Windows, sin el dominio.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-fg/60 mb-1.5">Nombre completo</label>
            <input
              type="text"
              placeholder="Juan Pérez"
              value={form.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className={inputCls}
            />
            {errors.full_name && <p className="text-xs text-danger mt-1">{errors.full_name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-fg/60 mb-1.5">
              Correo {isAd && <span className="text-fg/30 font-normal">(opcional)</span>}
            </label>
            <input
              type="email"
              placeholder="usuario@interseguro.com.pe"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`${inputCls} font-mono`}
            />
            {errors.email ? (
              <p className="text-xs text-danger mt-1">{errors.email}</p>
            ) : (
              !isAd && isEdit && (
                <p className="text-xs text-fg/30 mt-1">Es el correo con el que inicia sesión.</p>
              )
            )}
          </div>

          {!isAd && !isEdit && (
            <div>
              <label className="block text-xs font-medium text-fg/60 mb-1.5">
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
                <p className="text-xs text-danger mt-1">{errors.password}</p>
              ) : (
                <p className="text-xs text-fg/30 mt-1">
                  El usuario debería cambiarla en su primer ingreso.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-fg/60 mb-1.5">Rol</label>
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
            <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-danger">{serverError}</p>
            </div>
          )}

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
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

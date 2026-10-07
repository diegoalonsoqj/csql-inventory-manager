import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../api/client.js';

const PROJECT_ID_REGEX = /^[a-z][a-z0-9-]*$/;

export function AddProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ project_id: '', project_name: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.project_name.trim()) e.project_name = 'El nombre es obligatorio';
    if (!form.project_id.trim()) {
      e.project_id = 'El Project ID es obligatorio';
    } else if (!PROJECT_ID_REGEX.test(form.project_id)) {
      e.project_id = 'Solo minúsculas, dígitos y guiones, debe iniciar con letra';
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
      const project = await api.createProject(form);
      onCreated(project);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-base font-semibold text-fg">Agregar proyecto GCP</h2>
            <p className="text-xs text-fg/40 mt-0.5">El proyecto se marcará como activo por defecto</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg/40 hover:text-fg hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-fg/60 mb-1.5">
              Nombre del proyecto
            </label>
            <input
              type="text"
              placeholder="Mi Proyecto Producción"
              value={form.project_name}
              onChange={(e) => handleChange('project_name', e.target.value)}
              className="w-full bg-surface border border-surface-border text-sm text-fg/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-fg/20"
            />
            {errors.project_name && (
              <p className="text-xs text-danger mt-1">{errors.project_name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-fg/60 mb-1.5">
              Project ID <span className="text-fg/30">(GCP)</span>
            </label>
            <input
              type="text"
              placeholder="my-project-123"
              value={form.project_id}
              onChange={(e) => handleChange('project_id', e.target.value.toLowerCase())}
              className="w-full bg-surface border border-surface-border text-sm font-mono text-fg/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-fg/20"
            />
            {errors.project_id ? (
              <p className="text-xs text-danger mt-1">{errors.project_id}</p>
            ) : (
              <p className="text-xs text-fg/30 mt-1">Minúsculas, dígitos y guiones. Ej: mi-empresa-prod</p>
            )}
          </div>

          {serverError && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-danger">{serverError}</p>
            </div>
          )}

          {/* Actions */}
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
              Crear proyecto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

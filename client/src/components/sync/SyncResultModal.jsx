import { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Copy, Check } from 'lucide-react';
import { cn, formatDate, formatDuration } from '../../lib/utils.js';

const STATUS_META = {
  success: { label: 'Sincronización completa', icon: CheckCircle2, color: 'text-success', ring: 'border-success/20 bg-success/10' },
  partial: { label: 'Sincronización parcial', icon: AlertTriangle, color: 'text-warning', ring: 'border-warning/20 bg-warning/10' },
  failed: { label: 'Sincronización fallida', icon: XCircle, color: 'text-danger', ring: 'border-danger/20 bg-danger/10' },
  running: { label: 'Sincronización en curso', icon: AlertTriangle, color: 'text-warning', ring: 'border-warning/20 bg-warning/10' },
};

/**
 * Traduce el error crudo de la API de GCP a una acción concreta.
 */
function hintFor(failures) {
  const reasons = failures.map((f) => `${f.reason ?? ''} ${f.message ?? ''}`.toLowerCase());
  const any = (needle) => reasons.some((r) => r.includes(needle));

  if (any('networkerror') || any('fetch failed')) {
    return 'El servidor no logró contactar sqladmin.googleapis.com. Revisa la salida a internet / proxy / firewall de la máquina donde corre la app.';
  }
  if (any('accessnotconfigured') || any('service_disabled') || any('has not been used')) {
    return 'La Cloud SQL Admin API no está habilitada en ese proyecto: gcloud services enable sqladmin.googleapis.com --project <PROJECT_ID>';
  }
  if (any('permission') || any('forbidden') || failures.some((f) => f.http_status === 403)) {
    return 'La credencial no tiene el permiso cloudsql.instances.list. Otorga roles/cloudsql.viewer a la cuenta de servicio en cada proyecto afectado.';
  }
  if (any('unauthorized') || failures.some((f) => f.http_status === 401)) {
    return 'La credencial es inválida o expiró. Sube un JSON de cuenta de servicio en Configuración, o revisa las credenciales por defecto (ADC) del servidor.';
  }
  if (failures.some((f) => f.http_status === 404)) {
    return 'El proyecto no existe o la credencial no lo ve. Verifica el Project ID en la pantalla de Proyectos.';
  }
  return null;
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface rounded-lg px-3 py-2">
      <p className="text-xs text-fg/30">{label}</p>
      <p className="text-sm font-medium text-fg/80 mt-0.5">{value}</p>
    </div>
  );
}

function Shell({ meta, subtitle, onClose, children }) {
  const Icon = meta.icon;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-surface-card border border-surface-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center shrink-0', meta.ring)}>
              <Icon size={18} className={meta.color} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-fg truncate">{meta.label}</h2>
              <p className="text-xs text-fg/40 mt-0.5 truncate">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg/40 hover:text-fg hover:bg-surface-hover transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">{children}</div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-accent text-on-accent text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export function SyncResultModal({ result, triggerError, onClose }) {
  const [copied, setCopied] = useState(false);

  // Error al disparar el sync (409 ya en curso, 429 rate limit, red caída).
  if (triggerError) {
    return (
      <Shell onClose={onClose} meta={STATUS_META.failed} subtitle="No se pudo iniciar la sincronización">
        <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
          <p className="text-xs text-danger break-words">{triggerError}</p>
        </div>
      </Shell>
    );
  }

  if (!result) return null;

  const meta = STATUS_META[result.status] ?? STATUS_META.failed;
  const failures = Array.isArray(result.failed_projects) ? result.failed_projects : [];
  const hint = failures.length ? hintFor(failures) : null;
  const okProjects = (result.projects_count ?? 0) - failures.length;

  const copyDetail = async () => {
    const lines = [
      `Sync #${result.id} — ${result.status}`,
      `Inicio: ${formatDate(result.started_at)}`,
      `Proyectos: ${okProjects}/${result.projects_count} | Instancias: ${result.instances_count} | Databases: ${result.databases_count}`,
      result.error_message ? `Error: ${result.error_message}` : null,
      ...failures.map((f) => `- ${f.project_id}: [${f.http_status ?? f.reason ?? 'error'}] ${f.message}`),
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard bloqueado por el navegador: se ignora */
    }
  };

  return (
    <Shell onClose={onClose} meta={meta} subtitle={formatDate(result.started_at)}>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Proyectos OK" value={`${okProjects} / ${result.projects_count ?? 0}`} />
        <Stat label="Instancias" value={result.instances_count ?? 0} />
        <Stat label="Databases" value={result.databases_count ?? 0} />
        <Stat label="Duración" value={result.duration_ms != null ? formatDuration(result.duration_ms) : '—'} />
      </div>

      {result.error_message && (
        <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
          <p className="text-xs text-danger break-words">{result.error_message}</p>
        </div>
      )}

      {hint && (
        <div className="bg-accent-muted border border-accent/20 rounded-lg px-3 py-2.5">
          <p className="text-xs text-accent font-medium mb-0.5">Cómo resolverlo</p>
          <p className="text-xs text-fg/60 break-words">{hint}</p>
        </div>
      )}

      {failures.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-fg/60">Proyectos con error ({failures.length})</p>
            <button
              onClick={copyDetail}
              className="flex items-center gap-1.5 text-xs text-fg/40 hover:text-fg transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar detalle'}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {failures.map((f, i) => (
              <div key={`${f.project_id}-${i}`} className="bg-surface border border-surface-border rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-mono text-fg/80 truncate">{f.project_id ?? '(desconocido)'}</p>
                  {(f.http_status || f.reason) && (
                    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/20">
                      {f.http_status ?? ''}{f.http_status && f.reason ? ' · ' : ''}{f.reason ?? ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-fg/40 mt-1 break-words">{f.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {failures.length === 0 && result.status === 'success' && (
        <p className="text-xs text-fg/40">Todos los proyectos activos se sincronizaron sin errores.</p>
      )}
    </Shell>
  );
}

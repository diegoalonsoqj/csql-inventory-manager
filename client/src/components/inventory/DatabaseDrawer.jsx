import { X, Database, Shield } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils.js';
import { useInstanceDatabases } from '../../hooks/useInstances.js';

export function DatabaseDrawer({ instance, onClose }) {
  const { databases, loading } = useInstanceDatabases(instance?.id);

  if (!instance) return null;

  const userDbs = databases.filter((d) => !d.is_system);
  const systemDbs = databases.filter((d) => d.is_system);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-[420px] bg-surface-card border-l border-surface-border flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div>
            <p className="font-semibold text-white font-mono text-sm">{instance.instance_name}</p>
            <p className="text-xs text-white/40">{instance.project_id}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-surface-border grid grid-cols-2 gap-3">
          {[
            ['Engine', instance.engine],
            ['Versión', instance.database_version],
            ['Region', instance.region],
            ['Estado', instance.state],
            ['Storage', instance.storage_size_gb ? `${instance.storage_size_gb} GB` : '—'],
            ['Collation', instance.collation ?? '—'],
            ['Ambiente', instance.environment ?? '—'],
            ['Aplicación', instance.application ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-white/30">{label}</p>
              <p className="text-xs font-medium text-white mt-0.5">{value ?? '—'}</p>
            </div>
          ))}

          {instance.service_account && (
            <div className="col-span-2">
              <p className="text-xs text-white/30">Cuenta de Servicio</p>
              <p className="text-xs font-mono text-white/70 mt-0.5 break-all">{instance.service_account}</p>
            </div>
          )}

          <div className="col-span-2 border-t border-surface-border/50 pt-3 mt-1">
            <p className="text-xs text-white/30 mb-2">Direcciones IP</p>
            <div className="space-y-1.5">
              {[
                ['Primaria (pública)', instance.ip_primary],
                ['Saliente', instance.ip_outgoing],
                ['Privada', instance.ip_private],
                ['Etiqueta', instance.ip_label ? instance.ip_label.replace(/-/g, '.') : null],
              ].map(([tipo, ip]) => ip && (
                <div key={tipo} className="flex items-center justify-between">
                  <span className="text-xs text-white/40">{tipo}</span>
                  <span className="text-xs font-mono text-white/80">{ip}</span>
                </div>
              ))}
              {!instance.ip_primary && !instance.ip_outgoing && !instance.ip_private && !instance.ip_label && (
                <span className="text-xs text-white/20">Sin IPs registradas</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-sm text-white/30 text-center py-8">Cargando bases de datos…</div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Database size={14} className="text-accent" />
                <p className="text-xs font-medium text-white/60">
                  Bases de datos ({userDbs.length})
                </p>
              </div>
              <div className="space-y-1.5 mb-6">
                {userDbs.length === 0 ? (
                  <p className="text-xs text-white/20">No hay bases de datos</p>
                ) : (
                  userDbs.map((db) => (
                    <div key={db.id} className="bg-surface rounded-lg px-3 py-2 space-y-0.5">
                      <span className="text-sm font-mono text-white block">{db.database_name}</span>
                      <div className="flex gap-3">
                        {db.charset && <span className="text-xs text-white/30">{db.charset}</span>}
                        {db.collation && <span className="text-xs text-white/20">{db.collation}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {systemDbs.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={14} className="text-white/30" />
                    <p className="text-xs font-medium text-white/30">Sistema ({systemDbs.length})</p>
                  </div>
                  <div className="space-y-1.5">
                    {systemDbs.map((db) => (
                      <div key={db.id} className="flex items-center justify-between bg-surface/50 rounded-lg px-3 py-2">
                        <span className="text-xs font-mono text-white/30">{db.database_name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-surface-border">
          <p className="text-xs text-white/20">Sync: {formatDate(instance.synced_at)}</p>
        </div>
      </aside>
    </div>
  );
}

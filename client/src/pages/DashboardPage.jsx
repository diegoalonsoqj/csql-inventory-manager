import { Database, Layers, FolderOpen, PlayCircle, RefreshCw } from 'lucide-react';
import { Header } from '../components/layout/Header.jsx';
import { KpiCard } from '../components/dashboard/KpiCard.jsx';
import { EngineBreakdown } from '../components/dashboard/EngineBreakdown.jsx';
import { ProjectDistribution } from '../components/dashboard/ProjectDistribution.jsx';
import { RegionMap } from '../components/dashboard/RegionMap.jsx';
import { StatusOverview } from '../components/dashboard/StatusOverview.jsx';
import { useDashboard } from '../hooks/useDashboard.js';
import { formatDate, formatDuration } from '../lib/utils.js';

function SyncCard({ lastSync }) {
  if (!lastSync) return null;
  const statusColor = lastSync.status === 'success' ? 'text-green-400' : lastSync.status === 'failed' ? 'text-red-400' : 'text-yellow-400';
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-white/60 mb-3">Última Sincronización</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-white/30">Estado</p>
          <p className={`text-sm font-medium mt-0.5 ${statusColor}`}>{lastSync.status}</p>
        </div>
        <div>
          <p className="text-xs text-white/30">Duración</p>
          <p className="text-sm font-medium text-white mt-0.5">{formatDuration(lastSync.duration_ms)}</p>
        </div>
        <div>
          <p className="text-xs text-white/30">Proyectos</p>
          <p className="text-sm font-medium text-white mt-0.5">{lastSync.projects_count}</p>
        </div>
        <div>
          <p className="text-xs text-white/30">Instancias</p>
          <p className="text-sm font-medium text-white mt-0.5">{lastSync.instances_count}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-white/30">Ejecutado</p>
          <p className="text-xs font-mono text-white/50 mt-0.5">{formatDate(lastSync.started_at)}</p>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={refetch} className="mt-4 text-xs text-accent hover:underline">Reintentar</button>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="flex flex-col h-full">
      <div className="pt-7 shrink-0">
        <Header
          title="Dashboard"
          subtitle="Visión general del inventario Cloud SQL"
          actions={
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        }
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-7">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Total Instancias"
          value={loading ? '…' : kpis?.totalInstances}
          icon={Database}
          accent
        />
        <KpiCard
          title="Total Databases"
          value={loading ? '…' : kpis?.totalDatabases}
          icon={Layers}
        />
        <KpiCard
          title="Proyectos Activos"
          value={loading ? '…' : kpis?.activeProjects}
          icon={FolderOpen}
        />
        <KpiCard
          title="Instancias RUNNABLE"
          value={loading ? '…' : kpis?.runningInstances}
          icon={PlayCircle}
          subtitle={kpis ? `${Math.round((kpis.runningInstances / kpis.totalInstances) * 100) || 0}% del total` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
        <EngineBreakdown data={data?.engines} />
        <StatusOverview data={data?.states} />
        <SyncCard lastSync={data?.lastSync} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProjectDistribution data={data?.projects} />
        <RegionMap data={data?.regions} />
      </div>
      </div>
    </div>
  );
}

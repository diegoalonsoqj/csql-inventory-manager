import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Header } from '../components/layout/Header.jsx';
import { ProjectFilters } from '../components/projects/ProjectFilters.jsx';
import { ProjectTable } from '../components/projects/ProjectTable.jsx';
import { AddProjectModal } from '../components/projects/AddProjectModal.jsx';
import { useProjects } from '../hooks/useProjects.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export function ProjectsPage() {
  const { canManageProjects } = useAuth();
  const { data, loading, error, filters, updateFilter, setSort, refresh } = useProjects();
  const [showModal, setShowModal] = useState(false);

  const handleToggle = async (projectId) => {
    try {
      await api.toggleProject(projectId);
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="pt-7 pb-4 shrink-0">
        <Header
          title="Proyectos GCP"
          subtitle={data ? `${data.pagination.total} proyectos registrados` : 'Gestión de proyectos'}
          actions={
            canManageProjects && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-on-accent text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
              >
                <Plus size={15} />
                Nuevo proyecto
              </button>
            )
          }
        />
        <ProjectFilters filters={filters} onFilter={updateFilter} />
      </div>

      <div className="flex-1 min-h-0 pb-7">
        {error ? (
          <div className="text-center py-16 text-danger text-sm">{error}</div>
        ) : (
          <ProjectTable
            data={data?.data ?? []}
            pagination={data?.pagination}
            loading={loading}
            filters={filters}
            onFilter={updateFilter}
            onSort={setSort}
            onToggle={handleToggle}
            canManage={canManageProjects}
          />
        )}
      </div>

      {showModal && (
        <AddProjectModal
          onClose={() => setShowModal(false)}
          onCreated={() => refresh()}
        />
      )}
    </div>
  );
}

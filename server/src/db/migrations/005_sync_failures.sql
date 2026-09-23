-- 005_sync_failures.sql
-- Persiste el detalle de los proyectos que fallaron durante un sync.
-- Antes, un proyecto con error solo se imprimía a stdout y el sync se
-- registraba igualmente como 'success', ocultando el problema en la UI.

ALTER TABLE sync_log
    ADD COLUMN IF NOT EXISTS failed_projects JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN sync_log.failed_projects IS
    'Array de {project_id, message, http_status, reason} por cada proyecto que falló.';

-- status ahora admite: running | success | partial | failed
COMMENT ON COLUMN sync_log.status IS
    'running | success | partial (algunos proyectos fallaron) | failed';

-- Seed de proyectos GCP de ejemplo
-- Editar project_id y project_name según los proyectos reales
INSERT INTO gcp_projects (project_name, project_id, is_active) VALUES
    ('Producción Core', 'mi-empresa-prod-core', true),
    ('Producción Analytics', 'mi-empresa-prod-analytics', true),
    ('Staging', 'mi-empresa-staging', true),
    ('Desarrollo', 'mi-empresa-dev', true)
ON CONFLICT (project_id) DO UPDATE SET
    project_name = EXCLUDED.project_name,
    is_active    = EXCLUDED.is_active;

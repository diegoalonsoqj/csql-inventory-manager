-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GCP Projects
CREATE TABLE IF NOT EXISTS gcp_projects (
    id              SERIAL PRIMARY KEY,
    project_name    TEXT NOT NULL,
    project_id      TEXT NOT NULL UNIQUE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_active ON gcp_projects (is_active) WHERE is_active;

-- Cloud SQL Instances
CREATE TABLE IF NOT EXISTS csql_instances (
    id                      SERIAL PRIMARY KEY,
    project_id              TEXT NOT NULL REFERENCES gcp_projects(project_id),
    instance_name           TEXT NOT NULL,
    database_version        TEXT NOT NULL,
    engine                  TEXT GENERATED ALWAYS AS (
                                CASE
                                    WHEN database_version LIKE 'POSTGRES%'   THEN 'PostgreSQL'
                                    WHEN database_version LIKE 'MYSQL%'      THEN 'MySQL'
                                    WHEN database_version LIKE 'SQLSERVER%'  THEN 'SQL Server'
                                    ELSE 'Unknown'
                                END
                            ) STORED,
    region                  TEXT,
    state                   TEXT,
    tier                    TEXT,
    ip_primary              INET,
    ip_outgoing             INET,
    ip_private              INET,
    ip_label                TEXT,
    environment             TEXT,
    application             TEXT,
    info                    TEXT,
    service_account         TEXT,
    ha_enabled              BOOLEAN DEFAULT false,
    backup_enabled          BOOLEAN DEFAULT false,
    storage_size_gb         INTEGER,
    data_disk_type          TEXT,
    labels_raw              JSONB DEFAULT '{}',
    synced_at               TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now(),
    UNIQUE (project_id, instance_name)
);

CREATE INDEX IF NOT EXISTS idx_inst_project   ON csql_instances (project_id);
CREATE INDEX IF NOT EXISTS idx_inst_engine    ON csql_instances (engine);
CREATE INDEX IF NOT EXISTS idx_inst_state     ON csql_instances (state);
CREATE INDEX IF NOT EXISTS idx_inst_env       ON csql_instances (environment);
CREATE INDEX IF NOT EXISTS idx_inst_region    ON csql_instances (region);
CREATE INDEX IF NOT EXISTS idx_inst_name_trgm ON csql_instances USING gin (instance_name gin_trgm_ops);

-- Databases inside each instance
CREATE TABLE IF NOT EXISTS csql_databases (
    id              SERIAL PRIMARY KEY,
    instance_id     INTEGER NOT NULL REFERENCES csql_instances(id) ON DELETE CASCADE,
    database_name   TEXT NOT NULL,
    charset         TEXT,
    "collation"     TEXT,
    is_system       BOOLEAN DEFAULT false,
    synced_at       TIMESTAMPTZ NOT NULL,
    UNIQUE (instance_id, database_name)
);

CREATE INDEX IF NOT EXISTS idx_db_instance ON csql_databases (instance_id);

-- Sync log
CREATE TABLE IF NOT EXISTS sync_log (
    id              SERIAL PRIMARY KEY,
    started_at      TIMESTAMPTZ NOT NULL,
    finished_at     TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'running',
    projects_count  INTEGER DEFAULT 0,
    instances_count INTEGER DEFAULT 0,
    databases_count INTEGER DEFAULT 0,
    error_message   TEXT,
    duration_ms     INTEGER
);

-- Auto updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated ON gcp_projects;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON gcp_projects
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_instances_updated ON csql_instances;
CREATE TRIGGER trg_instances_updated BEFORE UPDATE ON csql_instances
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

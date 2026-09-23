import { query } from '../config/db.js';

let summaryCache = null;
let summaryCacheTs = 0;
const CACHE_TTL = 60_000;

export async function getDashboardSummary() {
  if (summaryCache && Date.now() - summaryCacheTs < CACHE_TTL) {
    return summaryCache;
  }

  const [kpis, engines, projects, regions, states, environments, lastSync] = await Promise.all([
    query(`
      SELECT
        COUNT(DISTINCT i.id)                                      AS total_instances,
        COUNT(DISTINCT d.id) FILTER (WHERE NOT d.is_system)       AS total_databases,
        COUNT(DISTINCT p.id) FILTER (WHERE p.is_active)           AS active_projects,
        COUNT(DISTINCT i.id) FILTER (WHERE i.state = 'RUNNABLE')  AS running_instances
      FROM csql_instances i
      LEFT JOIN csql_databases d ON d.instance_id = i.id
      LEFT JOIN gcp_projects p ON p.project_id = i.project_id
    `),
    query(`SELECT engine, COUNT(*)::int AS count FROM csql_instances GROUP BY engine ORDER BY count DESC`),
    query(`SELECT project_id, COUNT(*)::int AS count FROM csql_instances GROUP BY project_id ORDER BY count DESC LIMIT 20`),
    query(`SELECT region, COUNT(*)::int AS count FROM csql_instances GROUP BY region ORDER BY count DESC`),
    query(`SELECT state, COUNT(*)::int AS count FROM csql_instances GROUP BY state ORDER BY count DESC`),
    query(`SELECT environment, engine, COUNT(*)::int AS count FROM csql_instances GROUP BY environment, engine ORDER BY environment`),
    query(`SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 1`),
  ]);

  summaryCache = {
    kpis: {
      totalInstances: parseInt(kpis.rows[0].total_instances, 10),
      totalDatabases: parseInt(kpis.rows[0].total_databases, 10),
      activeProjects: parseInt(kpis.rows[0].active_projects, 10),
      runningInstances: parseInt(kpis.rows[0].running_instances, 10),
    },
    engines: engines.rows,
    projects: projects.rows,
    regions: regions.rows,
    states: states.rows,
    environments: environments.rows,
    lastSync: lastSync.rows[0] ?? null,
  };
  summaryCacheTs = Date.now();
  return summaryCache;
}

export function invalidateSummaryCache() {
  summaryCache = null;
}

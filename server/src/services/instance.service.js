import { query } from '../config/db.js';

function buildWhereClause(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (filters.engine) {
    conditions.push(`i.engine = $${idx++}`);
    params.push(filters.engine);
  }
  if (filters.project) {
    conditions.push(`i.project_id = $${idx++}`);
    params.push(filters.project);
  }
  if (filters.region) {
    conditions.push(`i.region = $${idx++}`);
    params.push(filters.region);
  }
  if (filters.state) {
    conditions.push(`i.state = $${idx++}`);
    params.push(filters.state);
  }
  if (filters.environment) {
    conditions.push(`i.environment = $${idx++}`);
    params.push(filters.environment);
  }
  if (filters.search) {
    conditions.push(`(
      i.instance_name ILIKE $${idx}
      OR i.ip_primary::text ILIKE $${idx}
      OR i.ip_outgoing::text ILIKE $${idx}
      OR i.ip_private::text ILIKE $${idx}
      OR i.ip_label ILIKE $${idx}
      OR EXISTS (
        SELECT 1 FROM csql_databases db
        WHERE db.instance_id = i.id AND db.database_name ILIKE $${idx}
      )
    )`);
    idx++;
    params.push(`%${filters.search}%`);
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

const ALLOWED_SORT = new Set(['instance_name', 'project_id', 'region', 'state', 'engine', 'synced_at']);

export async function listInstances(filters) {
  const { where, params } = buildWhereClause(filters);
  const sortBy = ALLOWED_SORT.has(filters.sortBy) ? filters.sortBy : 'instance_name';
  const sortDir = filters.sortDir === 'desc' ? 'DESC' : 'ASC';
  const limit = filters.limit;
  const offset = (filters.page - 1) * limit;

  const countParams = [...params];
  const dataParams = [...params, limit, offset];

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM csql_instances i ${where}`, countParams),
    query(
      `SELECT i.id, i.project_id, i.instance_name, i.database_version, i.engine,
              i.region, i.state, i.tier,
              i.ip_primary, i.ip_outgoing, i.ip_private, i.ip_label,
              i.environment, i.application, i.info, i.service_account, i.ha_enabled,
              i.backup_enabled, i.storage_size_gb, i.data_disk_type, i.synced_at,
              i.labels_raw->>'collation' AS collation
       FROM csql_instances i
       ${where}
       ORDER BY i.${sortBy} ${sortDir}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams
    ),
  ]);

  return {
    data: dataResult.rows,
    pagination: {
      total: countResult.rows[0].total,
      page: filters.page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit),
    },
  };
}

export async function getInstance(id) {
  const result = await query(
    `SELECT i.*, p.project_name
     FROM csql_instances i
     JOIN gcp_projects p ON p.project_id = i.project_id
     WHERE i.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getInstanceDatabases(id) {
  const result = await query(
    `SELECT id, database_name, charset, "collation", is_system, synced_at
     FROM csql_databases
     WHERE instance_id = $1
     ORDER BY is_system ASC, database_name ASC`,
    [id]
  );
  return result.rows;
}

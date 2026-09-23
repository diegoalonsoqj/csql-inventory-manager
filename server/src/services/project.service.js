import { query } from '../config/db.js';

const ALLOWED_SORT = {
  project_name: 'project_name',
  project_id: 'project_id',
  created_at: 'created_at',
};

function buildWhereClause(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (filters.search) {
    conditions.push(`(project_name ILIKE $${idx} OR project_id ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.is_active !== undefined && filters.is_active !== '') {
    conditions.push(`is_active = $${idx}`);
    params.push(filters.is_active === 'true');
    idx++;
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export async function listProjects(filters) {
  const { where, params } = buildWhereClause(filters);
  const sortCol = ALLOWED_SORT[filters.sortBy] ?? 'project_name';
  const sortDir = filters.sortDir === 'desc' ? 'DESC' : 'ASC';
  const limit = filters.limit ?? 50;
  const page = filters.page ?? 1;
  const offset = (page - 1) * limit;

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM gcp_projects ${where}`, params),
    query(
      `SELECT id, project_id, project_name, is_active, created_at, updated_at
       FROM gcp_projects ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
  ]);

  const total = countResult.rows[0].total;
  return {
    data: dataResult.rows,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function listProjectsSimple() {
  const result = await query(
    `SELECT project_id, project_name, is_active FROM gcp_projects ORDER BY project_name`
  );
  return result.rows;
}

export async function createProject({ project_id, project_name }) {
  const result = await query(
    `INSERT INTO gcp_projects (project_id, project_name)
     VALUES ($1, $2)
     ON CONFLICT (project_id) DO NOTHING
     RETURNING id, project_id, project_name, is_active, created_at`,
    [project_id, project_name]
  );
  if (result.rows.length === 0) {
    const err = new Error(`El proyecto '${project_id}' ya existe`);
    err.status = 409;
    throw err;
  }
  return result.rows[0];
}

export async function toggleProjectActive(projectId) {
  const result = await query(
    `UPDATE gcp_projects
     SET is_active = NOT is_active
     WHERE project_id = $1
     RETURNING id, project_id, project_name, is_active, updated_at`,
    [projectId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Proyecto no encontrado');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

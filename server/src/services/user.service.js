import { query } from '../config/db.js';
import { hashPassword, toPublicUser } from './auth.service.js';

const PUBLIC_COLUMNS = 'id, email, full_name, role, is_active, last_login_at, created_at, updated_at';

// Columnas permitidas para ORDER BY. Defensa en profundidad: aunque la ruta ya
// valida con Zod, nunca se interpola un valor fuera de este conjunto.
const ALLOWED_SORT = new Set(['full_name', 'email', 'role', 'created_at', 'last_login_at']);

export async function listUsers({ search, role, is_active, page, limit, sortBy, sortDir }) {
  const where = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(email ILIKE $${params.length} OR full_name ILIKE $${params.length})`);
  }
  if (role) {
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  if (is_active === 'true' || is_active === 'false') {
    params.push(is_active === 'true');
    where.push(`is_active = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const totalResult = await query(`SELECT COUNT(*)::int AS total FROM users ${whereClause}`, params);
  const total = totalResult.rows[0].total;

  // Normaliza el orden contra un whitelist antes de interpolar (no hay inyección).
  const orderCol = ALLOWED_SORT.has(sortBy) ? sortBy : 'full_name';
  const orderDir = sortDir === 'desc' ? 'DESC' : 'ASC';

  const dataResult = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users
     ${whereClause}
     ORDER BY ${orderCol} ${orderDir}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function createUser({ email, full_name, role, password }) {
  const normalized = email.trim().toLowerCase();
  const existing = await query('SELECT 1 FROM users WHERE lower(email) = $1', [normalized]);
  if (existing.rows.length) {
    const err = new Error('Ya existe un usuario con ese correo');
    err.status = 409;
    throw err;
  }

  const password_hash = await hashPassword(password);
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [normalized, password_hash, full_name.trim(), role]
  );
  return result.rows[0];
}

export async function updateUser(id, { full_name, role, is_active }) {
  const sets = [];
  const params = [];

  if (full_name !== undefined) {
    params.push(full_name.trim());
    sets.push(`full_name = $${params.length}`);
  }
  if (role !== undefined) {
    params.push(role);
    sets.push(`role = $${params.length}`);
  }
  if (is_active !== undefined) {
    params.push(is_active);
    sets.push(`is_active = $${params.length}`);
  }

  if (!sets.length) {
    const err = new Error('Nada que actualizar');
    err.status = 400;
    throw err;
  }

  params.push(id);
  const result = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${PUBLIC_COLUMNS}`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

export async function resetPassword(id, password) {
  const password_hash = await hashPassword(password);
  const result = await query(
    `UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING ${PUBLIC_COLUMNS}`,
    [password_hash, id]
  );
  if (!result.rows.length) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

/**
 * Cambio de contraseña propia: exige la contraseña actual.
 */
export async function changeOwnPassword(id, currentPassword, newPassword) {
  const bcrypt = (await import('bcryptjs')).default;
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }
  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) {
    const err = new Error('La contraseña actual es incorrecta');
    err.status = 400;
    throw err;
  }
  await resetPassword(id, newPassword);
}

/**
 * Desactiva (soft-delete) un usuario. No eliminamos filas para preservar
 * integridad de logs/auditoría futura.
 */
export async function deactivateUser(id) {
  const result = await query(
    `UPDATE users SET is_active = false WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

export async function countAdmins({ excludeId } = {}) {
  const result = await query(
    `SELECT COUNT(*)::int AS total FROM users
     WHERE role = 'admin' AND is_active = true ${excludeId ? 'AND id != $1' : ''}`,
    excludeId ? [excludeId] : []
  );
  return result.rows[0].total;
}

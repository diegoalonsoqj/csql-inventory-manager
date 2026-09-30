import { query } from '../config/db.js';
import { hashPassword, PUBLIC_COLUMNS } from './auth.service.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function assertEmailFree(email, excludeId = null) {
  const r = await query(
    'SELECT 1 FROM users WHERE lower(email) = $1 AND ($2::int IS NULL OR id != $2)',
    [email, excludeId]
  );
  if (r.rows.length) throw httpError('Ya existe un usuario con ese correo', 409);
}

async function assertAdUsernameFree(adUsername, excludeId = null) {
  const r = await query(
    'SELECT 1 FROM users WHERE lower(ad_username) = $1 AND ($2::int IS NULL OR id != $2)',
    [adUsername, excludeId]
  );
  if (r.rows.length) throw httpError('Ya existe un usuario con ese usuario de red', 409);
}

// Columnas permitidas para ORDER BY. Defensa en profundidad: aunque la ruta ya
// valida con Zod, nunca se interpola un valor fuera de este conjunto.
const ALLOWED_SORT = new Set(['full_name', 'email', 'role', 'created_at', 'last_login_at']);

export async function listUsers({ search, role, auth_type, is_active, page, limit, sortBy, sortDir }) {
  const where = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(email ILIKE $${params.length} OR full_name ILIKE $${params.length} OR ad_username ILIKE $${params.length})`
    );
  }
  if (role) {
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  if (auth_type) {
    params.push(auth_type);
    where.push(`auth_type = $${params.length}`);
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

export async function createUser(input) {
  const email = input.email ? input.email.trim().toLowerCase() : null;
  if (email) await assertEmailFree(email);

  if (input.auth_type === 'ad') {
    // Usuario AD: sin contraseña local; se valida contra el directorio al entrar.
    const adUsername = input.ad_username.trim().toLowerCase();
    await assertAdUsernameFree(adUsername);
    const result = await query(
      `INSERT INTO users (auth_type, ad_username, email, full_name, role)
       VALUES ('ad', $1, $2, $3, $4)
       RETURNING ${PUBLIC_COLUMNS}`,
      [adUsername, email, input.full_name.trim(), input.role]
    );
    return result.rows[0];
  }

  const password_hash = await hashPassword(input.password);
  const result = await query(
    `INSERT INTO users (auth_type, email, password_hash, full_name, role)
     VALUES ('local', $1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [email, password_hash, input.full_name.trim(), input.role]
  );
  return result.rows[0];
}

async function getAuthType(id) {
  const r = await query('SELECT auth_type FROM users WHERE id = $1', [id]);
  if (!r.rows.length) throw httpError('Usuario no encontrado', 404);
  return r.rows[0].auth_type;
}

export async function updateUser(id, { full_name, role, is_active, ad_username, email }) {
  const sets = [];
  const params = [];

  // Usuario de red y correo solo se editan en usuarios AD: en los locales el
  // correo es el login y se mantiene fijo.
  if (ad_username !== undefined || email !== undefined) {
    if ((await getAuthType(id)) !== 'ad') {
      throw httpError('El usuario de red y el correo solo se editan en usuarios de AD', 400);
    }
  }

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
  if (ad_username !== undefined) {
    const normalized = ad_username.trim().toLowerCase();
    await assertAdUsernameFree(normalized, id);
    params.push(normalized);
    sets.push(`ad_username = $${params.length}`);
  }
  if (email !== undefined) {
    const normalized = email ? email.trim().toLowerCase() : null;
    if (normalized) await assertEmailFree(normalized, id);
    params.push(normalized);
    sets.push(`email = $${params.length}`);
  }

  if (!sets.length) throw httpError('Nada que actualizar', 400);

  params.push(id);
  const result = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${PUBLIC_COLUMNS}`,
    params
  );
  if (!result.rows.length) throw httpError('Usuario no encontrado', 404);
  return result.rows[0];
}

export async function resetPassword(id, password) {
  if ((await getAuthType(id)) === 'ad') {
    throw httpError('Los usuarios de AD gestionan su contraseña en Active Directory', 400);
  }
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
  const result = await query('SELECT password_hash, auth_type FROM users WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw httpError('Usuario no encontrado', 404);
  if (row.auth_type === 'ad') {
    throw httpError('Los usuarios de AD gestionan su contraseña en Active Directory', 400);
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

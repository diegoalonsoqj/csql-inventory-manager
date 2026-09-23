import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { config } from '../config/env.js';

// Columnas seguras para exponer al cliente (nunca password_hash).
const PUBLIC_COLUMNS = 'id, email, full_name, role, is_active, last_login_at, created_at, updated_at';

export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, config.auth.bcryptRounds);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn, algorithm: 'HS256' }
  );
}

export function verifyToken(token) {
  // Restringe el algoritmo aceptado para evitar ataques de confusión de algoritmo.
  return jwt.verify(token, config.auth.jwtSecret, { algorithms: ['HS256'] });
}

// Opciones base de la cookie de sesión (httpOnly: inaccesible a JS).
function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.security.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: config.auth.cookieMaxAgeMs,
  };
}

/**
 * Emite la sesión: cookie httpOnly con el JWT + cookie CSRF (double-submit,
 * legible por JS para que el cliente la reenvíe como header).
 */
export function issueSession(res, user) {
  const token = signToken(user);
  res.cookie(config.auth.cookieName, token, sessionCookieOptions());

  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie(config.auth.csrfCookieName, csrfToken, {
    httpOnly: false, // el cliente debe leerla y reenviarla como X-CSRF-Token
    secure: config.security.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: config.auth.cookieMaxAgeMs,
  });
  return csrfToken;
}

/**
 * Limpia las cookies de sesión y CSRF.
 */
export function clearSession(res) {
  const base = { path: '/', sameSite: 'lax', secure: config.security.cookieSecure };
  res.clearCookie(config.auth.cookieName, { ...base, httpOnly: true });
  res.clearCookie(config.auth.csrfCookieName, { ...base, httpOnly: false });
}

/**
 * Valida credenciales y devuelve el usuario público, o lanza Error 401.
 * Se ejecuta bcrypt.compare aunque el usuario no exista para mitigar
 * ataques de enumeración por timing.
 */
export async function login(email, password) {
  const normalized = email.trim().toLowerCase();
  const result = await query(
    `SELECT id, email, password_hash, full_name, role, is_active, last_login_at, created_at, updated_at
     FROM users WHERE lower(email) = $1`,
    [normalized]
  );
  const user = result.rows[0];

  // Hash dummy para igualar tiempos cuando el usuario no existe.
  const hash = user?.password_hash ?? '$2a$12$0000000000000000000000000000000000000000000000000000';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok || !user.is_active) {
    const err = new Error('Credenciales inválidas');
    err.status = 401;
    throw err;
  }

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  return toPublicUser(user);
}

export async function getUserById(id) {
  const result = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

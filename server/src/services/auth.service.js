import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { config } from '../config/env.js';
import { getAdConfig } from './settings.service.js';
import { adAuthenticate, normalizeAdUsername } from './ad.service.js';

// Columnas seguras para exponer al cliente (nunca password_hash).
export const PUBLIC_COLUMNS =
  'id, email, full_name, role, auth_type, ad_username, is_active, last_login_at, created_at, updated_at';

export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    auth_type: row.auth_type,
    ad_username: row.ad_username,
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

const DUMMY_HASH = '$2a$12$0000000000000000000000000000000000000000000000000000';

function invalidCredentials() {
  const err = new Error('Credenciales inválidas');
  err.status = 401;
  return err;
}

/**
 * Valida credenciales y devuelve el usuario público, o lanza Error 401.
 *
 * `identifier` puede ser el correo (usuarios locales o AD con correo) o el
 * usuario de red (AD), con o sin prefijo de dominio: "INTERSEGURO\jperez".
 * Según el auth_type del usuario, la contraseña se valida con bcrypt o con
 * un bind contra AD. Solo entran usuarios dados de alta en la app.
 */
export async function login(identifier, password) {
  const raw = identifier.trim().toLowerCase();
  const adName = normalizeAdUsername(raw);
  const result = await query(
    `SELECT id, email, password_hash, full_name, role, auth_type, ad_username, is_active,
            last_login_at, created_at, updated_at
     FROM users
     WHERE lower(email) = $1 OR lower(ad_username) = $2
     ORDER BY (lower(email) = $1) DESC NULLS LAST
     LIMIT 1`,
    [raw, adName]
  );
  const user = result.rows[0];

  if (user?.auth_type === 'ad') {
    // Un usuario inactivo no llega al directorio: no suma intentos fallidos
    // a su cuenta de dominio.
    if (!user.is_active) throw invalidCredentials();
    const ad = await getAdConfig();
    if (!ad.enabled || !ad.url || !ad.domain) {
      console.warn(`[AUTH] Login AD rechazado para ${user.ad_username}: AD deshabilitado o sin configurar`);
      throw invalidCredentials();
    }
    // Errores de conexión (503) se propagan: así el usuario no reintenta
    // pensando que su contraseña es incorrecta (y no bloquea su cuenta AD).
    await adAuthenticate(ad, user.ad_username, password);
  } else {
    // Se ejecuta bcrypt.compare aunque el usuario no exista para mitigar
    // ataques de enumeración por timing.
    const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok || !user.is_active) throw invalidCredentials();
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

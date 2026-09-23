import crypto from 'crypto';
import { config } from '../config/env.js';

// Métodos que no modifican estado: no requieren token CSRF.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Rutas exentas: el login no puede traer token CSRF todavía (primer contacto).
const EXEMPT_PATHS = new Set(['/api/auth/login']);

/**
 * Protección CSRF por double-submit cookie:
 * el cliente reenvía el valor de la cookie CSRF (legible por JS) en el header
 * X-CSRF-Token. Como otro origen no puede leer esa cookie (SOP), no puede
 * forjar el header. Se combina con cookies SameSite=Lax como defensa en capas.
 */
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  const cookieToken = req.cookies?.[config.auth.csrfCookieName];
  const headerToken = req.get('X-CSRF-Token');

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: { message: 'Falta el token CSRF' } });
  }

  // Comparación en tiempo constante; longitudes distintas -> rechazo.
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: { message: 'Token CSRF inválido' } });
  }

  next();
}

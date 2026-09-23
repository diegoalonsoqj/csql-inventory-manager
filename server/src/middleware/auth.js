import { verifyToken, getUserById } from '../services/auth.service.js';
import { config } from '../config/env.js';

/**
 * Exige un JWT válido en la cookie de sesión (httpOnly).
 * Revalida el usuario contra la BD en cada request para que desactivar
 * un usuario surta efecto inmediato (aunque su token aún no expire).
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[config.auth.cookieName];

    if (!token) {
      return res.status(401).json({ error: { message: 'No autenticado' } });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ error: { message: 'Sesión inválida o expirada' } });
    }

    const user = await getUserById(payload.sub);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: { message: 'Usuario no válido' } });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Debe usarse después de requireAuth. Restringe a uno de los roles dados.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: { message: 'No tienes permisos para esta acción' } });
    }
    next();
  };
}

/**
 * Debe usarse después de requireAuth. Restringe a rol admin.
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: { message: 'Requiere permisos de administrador' } });
  }
  next();
}

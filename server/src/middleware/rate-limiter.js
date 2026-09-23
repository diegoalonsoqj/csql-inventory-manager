import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

export const syncRateLimiter = rateLimit({
  windowMs: config.sync.rateLimitWindowMs,
  max: config.sync.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many sync requests. Try again in 5 minutes.' } },
});

// Protege el login contra fuerza bruta: 10 intentos por IP cada 15 min.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // No contar los logins exitosos, solo los fallidos.
  skipSuccessfulRequests: true,
  message: { error: { message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' } },
});

// Protege el cambio de contraseña propia contra fuerza bruta de la contraseña
// actual: 5 intentos fallidos cada 15 min. Se aplica DESPUÉS de requireAuth,
// así que se limita por usuario (con fallback a IP por robustez).
export const passwordChangeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : req.ip),
  message: { error: { message: 'Demasiados intentos de cambio de contraseña. Intenta de nuevo en 15 minutos.' } },
});

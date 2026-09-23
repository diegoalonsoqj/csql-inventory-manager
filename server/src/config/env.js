const required = (name) => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
};

const optional = (name, fallback) => process.env[name] ?? fallback;

// Interpreta TRUST_PROXY para Express:
//  - vacío/ausente  -> false (no confiar; comportamiento por defecto)
//  - 'true'/'false' -> booleano
//  - número         -> cantidad de saltos de proxy (ej. '1')
//  - otro           -> se pasa tal cual (ej. subred/IP)
const parseTrustProxy = (raw) => {
  if (raw == null || raw === '') return false;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const n = Number(raw);
  return Number.isInteger(n) ? n : raw;
};

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3001'), 10),
  isDev: optional('NODE_ENV', 'development') === 'development',
  // Config de confianza en proxy (afecta req.ip y el rate-limiting).
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),

  db: {
    url: required('DATABASE_URL'),
    poolMax: parseInt(optional('PG_POOL_MAX', '20'), 10),
    idleTimeout: parseInt(optional('PG_IDLE_TIMEOUT', '30000'), 10),
  },

  gcp: {
    maxConcurrentProjects: parseInt(optional('GCP_MAX_CONCURRENT_PROJECTS', '10'), 10),
    maxConcurrentInstances: parseInt(optional('GCP_MAX_CONCURRENT_INSTANCES', '20'), 10),
    requestTimeout: parseInt(optional('GCP_REQUEST_TIMEOUT', '60000'), 10),
  },

  auth: {
    jwtSecret: required('JWT_SECRET'),
    // Duración del token de sesión. Ej: '8h', '1d'.
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '8h'),
    // Costo de bcrypt. 12 es un buen balance seguridad/rendimiento.
    bcryptRounds: parseInt(optional('BCRYPT_ROUNDS', '12'), 10),
    // Cookie de sesión (httpOnly) y cookie CSRF (double-submit, legible por JS).
    cookieName: 'csqlim_token',
    csrfCookieName: 'csqlim_csrf',
    // Retención de la cookie en el navegador (ms). Por defecto 8h.
    cookieMaxAgeMs: parseInt(optional('COOKIE_MAX_AGE_MS', String(8 * 60 * 60 * 1000)), 10),
  },

  security: {
    // Clave maestra para cifrar secretos guardados en BD (AES-256-GCM).
    encryptionKey: required('APP_ENCRYPTION_KEY'),
    // Marca las cookies como Secure (solo HTTPS). Poner true en producción con
    // TLS. Por defecto false para no romper despliegues por HTTP.
    cookieSecure: optional('COOKIE_SECURE', 'false') === 'true',
  },

  sync: {
    rateLimitWindowMs: parseInt(optional('SYNC_RATE_LIMIT_WINDOW_MS', '300000'), 10),
    rateLimitMax: parseInt(optional('SYNC_RATE_LIMIT_MAX', '1'), 10),
  },
};

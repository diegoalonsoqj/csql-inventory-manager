import { config } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  const status = err.status ?? err.statusCode ?? 500;
  console.error(`[ERROR] ${req.method} ${req.path} → ${status}:`, err.message);
  if (config.isDev) console.error(err.stack);

  // Los errores 4xx son fallos esperados del cliente y su mensaje es seguro
  // de exponer. Los 5xx pueden filtrar detalles internos, así que se ocultan
  // en producción.
  const safeToExpose = config.isDev || status < 500;

  res.status(status).json({
    error: {
      message: safeToExpose ? err.message : 'Internal server error',
      ...(config.isDev && { stack: err.stack }),
    },
  });
}

export function notFound(req, res) {
  res.status(404).json({ error: { message: `Route ${req.method} ${req.path} not found` } });
}

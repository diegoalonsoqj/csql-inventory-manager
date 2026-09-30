import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { checkDbConnection } from './config/db.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { requireAuth } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import instancesRoutes from './routes/instances.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import syncRoutes from './routes/sync.routes.js';
import exportRoutes from './routes/export.routes.js';
import { startSyncScheduler } from './services/sync-scheduler.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// Confianza en proxy (para req.ip correcto y rate-limiting fiable detrás de un
// reverse proxy / load balancer). Por defecto false; configurar TRUST_PROXY=1
// solo cuando la app corra detrás de un proxy.
app.set('trust proxy', config.trustProxy);

// helmet activa por defecto la directiva CSP `upgrade-insecure-requests`, que
// hace que el navegador pida los assets por https:// aunque la página se haya
// servido por http. Sirviendo la app por HTTP plano (típico en red interna, sin
// TLS) eso rompe la carga del bundle y deja la pantalla en blanco. Se desactiva
// salvo que se declare que hay HTTPS delante (COOKIE_SECURE=true).
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: config.security.cookieSecure ? {} : { upgradeInsecureRequests: null },
  },
}));
app.use(cors({
  // Con cookies de sesión no se puede usar '*'. En dev se refleja el origen
  // (el frontend suele ir por el proxy de Vite, mismo-origen); en prod se
  // restringe a FRONTEND_ORIGIN. credentials habilita el envío de cookies.
  origin: config.isDev ? true : process.env.FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));
app.use(compression());
app.use(express.json());
app.use(cookieParser());

// Protección CSRF (double-submit) para métodos que modifican estado.
app.use(csrfProtection);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Rutas públicas de autenticación (login). /me y /change-password se
// autoprotegen internamente.
app.use('/api/auth', authRoutes);

// Gestión de usuarios: requiere admin (aplicado dentro del router).
app.use('/api/users', usersRoutes);

// Configuración de la app: admin (con /public para lectura de zona horaria).
app.use('/api/settings', settingsRoutes);

// Todas las rutas de datos requieren un usuario autenticado.
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/instances', requireAuth, instancesRoutes);
app.use('/api/projects', requireAuth, projectsRoutes);
app.use('/api/sync', requireAuth, syncRoutes);
app.use('/api/export', requireAuth, exportRoutes);

app.use('/api', notFound);

if (!config.isDev) {
  const publicDir = join(__dirname, '../public');
  app.use(express.static(publicDir));
  app.get('*splat', (_req, res) => res.sendFile(join(publicDir, 'index.html')));
} else {
  app.use(notFound);
}

app.use(errorHandler);

const start = async () => {
  await checkDbConnection();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[SERVER] Running on http://0.0.0.0:${config.port} (${config.nodeEnv})`);
  });
  startSyncScheduler();
};

start().catch((err) => {
  console.error('[SERVER] Failed to start:', err.message);
  process.exit(1);
});

export default app;

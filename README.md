# CloudSQL Inventory Manager

Plataforma web interna que reemplaza el script `generar_inventario.py`. Genera y visualiza un inventario completo de instancias Cloud SQL en todos los proyectos GCP de la organización, con dashboard analítico y tabla de detalle interactiva.

---

## Características

- **Dashboard** con KPIs en tiempo real: total de instancias, bases de datos, proyectos activos e instancias RUNNABLE
- **Gráficas** de distribución por engine (PostgreSQL / MySQL / SQL Server), proyecto, región, estado y ambiente
- **Tabla de inventario** con paginación, ordenamiento, filtros múltiples y búsqueda por nombre de instancia, IPs y bases de datos
- **Drawer de detalle** con las bases de datos de cada instancia
- **Gestión de proyectos GCP** — alta, activar/desactivar desde la UI
- **Exportación a Excel** con los mismos filtros activos de la tabla
- **Sincronización con GCP** en paralelo via Cloud SQL Admin API
- **Modo producción** — un solo proceso Node.js sirve API + frontend estático

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 24 LTS (ESM nativo) |
| Backend | Express 5 |
| Base de datos | PostgreSQL 16 (Cloud SQL) |
| ORM/Query | pg (node-postgres) + pool |
| Frontend | React 18 + Vite 6 |
| UI Kit | Tailwind CSS 3 + shadcn/ui |
| Charts | Recharts |
| Tablas | TanStack Table v8 |
| GCP SDK | @googleapis/sqladmin v35 |
| Auth GCP | google-auth-library (Application Default Credentials) |
| Excel | ExcelJS |
| Process manager | PM2 |

---

## Estructura del proyecto

```
csql-inventory-manager/
├── ecosystem.config.cjs        # Configuración PM2 (producción)
├── package.json                # Scripts raíz: dev, build, start
├── .env.example
├── docker-compose.yml          # PostgreSQL 16 local (opcional)
│
├── server/                     # Backend Express
│   ├── package.json
│   └── src/
│       ├── app.js              # Bootstrap: rutas, middleware, static en prod
│       ├── config/
│       │   ├── env.js          # Validación de variables de entorno
│       │   └── db.js           # Pool de conexiones pg
│       ├── middleware/
│       │   ├── error-handler.js
│       │   ├── rate-limiter.js
│       │   └── validate.js     # Esquemas Zod
│       ├── routes/
│       │   ├── dashboard.routes.js
│       │   ├── instances.routes.js
│       │   ├── projects.routes.js
│       │   ├── sync.routes.js
│       │   └── export.routes.js
│       ├── services/
│       │   ├── gcp-sync.service.js   # Cloud SQL Admin API
│       │   ├── dashboard.service.js  # Queries agregadas
│       │   ├── instance.service.js   # CRUD + búsqueda
│       │   ├── project.service.js    # CRUD proyectos GCP
│       │   └── export.service.js     # Generación Excel
│       └── db/
│           ├── migrations/001_init.sql
│           └── seed/seed_projects.sql
│
├── client/                     # Frontend React + Vite
│   ├── package.json
│   ├── vite.config.js          # build.outDir → ../server/public
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       │   ├── DashboardPage.jsx
│       │   ├── InventoryPage.jsx
│       │   └── ProjectsPage.jsx
│       ├── components/
│       │   ├── layout/         # Sidebar, Header
│       │   ├── dashboard/      # KpiCard, charts
│       │   ├── inventory/      # InstanceTable, ColumnFilters, DatabaseDrawer, ExportButton
│       │   └── projects/       # ProjectTable, ProjectFilters, AddProjectModal
│       ├── hooks/
│       │   ├── useDashboard.js
│       │   ├── useInstances.js
│       │   └── useProjects.js
│       └── api/client.js
│
└── scripts/
    ├── migrate.js              # Ejecuta migraciones SQL
    └── sync-inventory.js       # Sync manual / seed desde SQLite
```

---

## Requisitos previos

- **Node.js 22+** (recomendado 24 LTS)
- **PostgreSQL 16** — instancia Cloud SQL o local via Docker
- **Credenciales GCP** — Application Default Credentials configuradas (`gcloud auth application-default login`)
- **Acceso de red a Cloud SQL** — VPN o Cloud SQL Auth Proxy

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd csql-inventory-manager

# 2. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con los valores reales

# 3. Instalar dependencias
npm install            # raíz (concurrently)
cd server && npm install
cd ../client && npm install

# 4. Ejecutar migraciones
cd ..
node --env-file=.env scripts/migrate.js
```

---

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

```env
# Servidor
NODE_ENV=development
PORT=3001

# PostgreSQL
DATABASE_URL=postgresql://usuario:password@HOST:5432/csql_inventory
PG_POOL_MAX=20
PG_IDLE_TIMEOUT=30000

# GCP — concurrencia del sync
GCP_MAX_CONCURRENT_PROJECTS=10
GCP_MAX_CONCURRENT_INSTANCES=20
GCP_REQUEST_TIMEOUT=60000

# Rate limiting del endpoint /api/sync
SYNC_RATE_LIMIT_WINDOW_MS=300000
SYNC_RATE_LIMIT_MAX=1

# Frontend (solo dev)
VITE_API_URL=http://localhost:3001/api
```

> **Nota de seguridad:** Nunca commitear el archivo `.env`. Está incluido en `.gitignore`.

---

## Desarrollo

Un solo comando desde la raíz levanta backend y frontend en paralelo:

```bash
npm run dev
```

| Proceso | Puerto | URL |
|---------|--------|-----|
| Backend (Express) | 3001 | http://localhost:3001 |
| Frontend (Vite + HMR) | 5173 | http://localhost:5173 |

El frontend en dev proxea `/api/*` automáticamente al backend.

---

## Producción

```bash
# Desde la raíz del proyecto
npm start
```

Este comando ejecuta en secuencia:
1. `npm run build` — compila el frontend en `server/public/`
2. `npm run start --prefix server` — levanta Express que sirve API + estáticos

La app queda disponible en un solo puerto: `http://localhost:3001`

### Con PM2 (recomendado)

```bash
# Primera vez
npm run build
pm2 start ecosystem.config.cjs
pm2 save                         # guarda la lista de procesos en ~/.pm2/dump.pm2
```

**Auto-inicio en Windows** — `pm2 startup` no es compatible con Windows. En su lugar, crear una tarea en el Programador de tareas:

- **Programa:** ruta completa a `pm2.cmd` (obtener con `(Get-Command pm2).Source` en PowerShell)
- **Argumentos:** `resurrect`
- **Desencadenador:** Al iniciar sesión
- **Ejecutar con privilegios más altos:** sí
- **Condiciones:** desmarcar "solo si está conectado a la corriente"

Para verificar que la tarea funciona correctamente:

```bash
pm2 kill        # mata el daemon completamente
pm2 resurrect   # levanta desde el dump guardado
pm2 status      # debe mostrar csql-inventory online
```

```bash
# Actualizar después de cambios
npm run build && pm2 restart csql-inventory
```

Comandos PM2 útiles:

```bash
pm2 status                       # estado del proceso
pm2 logs csql-inventory          # logs en tiempo real
pm2 restart csql-inventory       # reiniciar
pm2 stop csql-inventory          # detener
pm2 monit                        # monitor interactivo
```

---

## API

### Dashboard
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | KPIs, breakdown por engine, región, estado, ambiente |

### Instancias
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/instances` | Lista paginada con filtros y búsqueda |
| GET | `/api/instances/:id` | Detalle de instancia |
| GET | `/api/instances/:id/databases` | Bases de datos de una instancia |

### Proyectos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/projects` | Lista paginada de proyectos |
| GET | `/api/projects/simple` | Lista simple para dropdowns |
| POST | `/api/projects` | Crear proyecto |
| PATCH | `/api/projects/:id/toggle` | Activar/desactivar proyecto |

### Sincronización
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sync` | Dispara sync con GCP (rate limit: 1/5min) |
| GET | `/api/sync/status` | Estado de la última sincronización |

### Exportación
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/export/excel` | Descarga Excel con filtros aplicados |

---

## Flujo de sincronización

1. `POST /api/sync` inicia el proceso
2. Crea registro en `sync_log` (status: `running`)
3. Lee proyectos activos de `gcp_projects`
4. Para cada proyecto (paralelo, máx. 10): llama `instances.list()` de Cloud SQL Admin API
5. Para cada instancia (paralelo, máx. 20): llama `databases.list()`
6. UPSERT en `csql_instances` y `csql_databases` (ON CONFLICT)
7. Marca instancias no vistas en este sync como `state = 'DELETED'`
8. Actualiza `sync_log` con contadores y duración

---

## Modelo de datos

```
gcp_projects          csql_instances              csql_databases
─────────────         ──────────────              ──────────────
id (PK)               id (PK)                     id (PK)
project_name          project_id → gcp_projects   instance_id → csql_instances
project_id (UNIQUE)   instance_name               database_name
is_active             database_version            charset
created_at            engine (GENERATED)          collation
updated_at            region                      is_system
                      state                       synced_at
                      tier
                      ip_primary / ip_outgoing
                      ip_private / ip_label
                      environment / application
                      ha_enabled / backup_enabled
                      storage_size_gb
                      labels_raw (JSONB)
                      synced_at

sync_log
────────
id, started_at, finished_at, status,
projects_count, instances_count,
databases_count, error_message, duration_ms
```

---

## Seguridad

- Prepared statements en todas las queries (nunca interpolación directa)
- Helmet.js para headers HTTP seguros
- Rate limiting en `/api/sync` (1 request cada 5 minutos)
- CORS restrictivo en producción (solo origin del frontend)
- Validación de inputs con Zod en todos los endpoints
- Errores internos no expuestos al cliente en producción
- Pool de conexiones con límite configurable (default: 20)

---

## Decisiones de diseño

| Decisión | Razón |
|----------|-------|
| `@googleapis/sqladmin` en lugar de `@google-cloud/sql-admin` | El paquete `@google-cloud/sql-admin` no existe en npm; la alternativa funcional es el cliente generado automáticamente |
| `engine` como columna GENERATED | Derivado de `database_version`; evita inconsistencias en escritura |
| `labels_raw` JSONB | Preserva todos los labels GCP para consultas futuras sin alterar el schema |
| `build.outDir = ../server/public` | En producción un solo proceso Express sirve todo; elimina la necesidad de nginx/CDN para uso interno |
| `interpreter_args` como array en PM2 | Evita que PM2 divida rutas con espacios en múltiples argumentos en Windows |

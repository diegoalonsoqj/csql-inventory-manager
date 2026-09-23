# syntax=docker/dockerfile:1
# ============================================================================
#  CloudSQL Inventory Manager (CSQL-IM) — imagen única
#  Express sirve la API (/api/*) Y el frontend compilado (server/public) en el
#  MISMO origen. Un solo contenedor, sin CORS entre dominios.
#
#  Sirve igual para Docker / Docker Compose y para Cloud Run (que inyecta PORT).
#  El contenedor arranca con "node src/app.js" (SIN --env-file): las variables
#  de entorno se inyectan desde fuera (env_file, -e, o Secret Manager).
# ============================================================================

# ---- Etapa 1: build --------------------------------------------------------
FROM node:24-slim AS build
WORKDIR /app

# Dependencias del cliente primero: capa cacheada mientras no cambie el lockfile
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

# Dependencias de PRODUCCION del servidor (omite devDeps: better-sqlite3, eslint)
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Código fuente y build del SPA. Vite emite a ../server/public (vite.config.js).
# OJO: NO se define VITE_API_URL a propósito -> el cliente usa '/api' relativo,
# requisito del esquema de sesión por cookie (fetch con credentials same-origin).
COPY client/ ./client/
COPY server/ ./server/
RUN cd client && npm run build

# ---- Etapa 2: runtime ------------------------------------------------------
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/server

# Solo el servidor + sus node_modules de prod + el SPA ya compilado en public/
COPY --from=build --chown=node:node /app/server ./

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/app.js"]

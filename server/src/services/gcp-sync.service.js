import { GoogleAuth } from 'google-auth-library';
import { query } from '../config/db.js';
import { config } from '../config/env.js';
import { invalidateSummaryCache } from './dashboard.service.js';
import { getServiceAccountCredentials } from './settings.service.js';

const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

/**
 * Construye un cliente de autenticación GCP. Prioriza la cuenta de servicio
 * configurada en Settings (cifrada en BD); si no hay ninguna, cae a las
 * Application Default Credentials del entorno (ADC / metadata server).
 */
async function getAuth(saCredentials) {
  const sa = saCredentials ?? (await getServiceAccountCredentials());
  return sa
    ? new GoogleAuth({ credentials: sa, scopes: SCOPES })
    : new GoogleAuth({ scopes: SCOPES });
}

async function getToken(saCredentials) {
  const auth = await getAuth(saCredentials);
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

/**
 * Prueba la credencial GCP: obtiene un token y, si hay proyectos activos,
 * intenta listar instancias del primero para validar acceso real a la API.
 * Si se pasa `saCredentials`, prueba esa (aún sin guardar); si no, la guardada.
 */
export async function testGcpConnection(saCredentials = null) {
  const token = await getToken(saCredentials);
  if (!token) throw new Error('No se pudo obtener un token de acceso');

  const projectResult = await query(
    `SELECT project_id FROM gcp_projects WHERE is_active = true ORDER BY project_id LIMIT 1`
  );
  const testProject = projectResult.rows[0]?.project_id;

  if (!testProject) {
    return { ok: true, tokenObtained: true, apiCallTested: false,
      message: 'Token obtenido. No hay proyectos activos para probar el acceso a la API.' };
  }

  await gcpGet(token, `${testProject}/instances`);
  return { ok: true, tokenObtained: true, apiCallTested: true, testProject,
    message: `Credencial válida. Acceso a la API confirmado en el proyecto ${testProject}.` };
}

const BASE = 'https://sqladmin.googleapis.com/v1/projects';

async function gcpGet(token, path) {
  let res;
  try {
    res = await fetch(`${BASE}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (netErr) {
    // Fallo de red/DNS/proxy: no hubo respuesta HTTP.
    const err = new Error(`No se pudo contactar sqladmin.googleapis.com: ${netErr.message}`);
    err.reason = 'networkError';
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error?.message ?? `HTTP ${res.status}`);
    err.httpStatus = res.status;
    err.reason = body?.error?.errors?.[0]?.reason ?? body?.error?.status ?? null;
    throw err;
  }
  return res.json();
}

async function withConcurrency(items, limit, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const settled = await Promise.allSettled(batch.map(fn));
    results.push(...settled);
  }
  return results;
}

function extractIp(ipAddresses, type) {
  const entry = ipAddresses?.find((ip) => ip.type === type);
  return entry?.ipAddress ?? null;
}

async function syncProject(token, projectId, syncedAt) {
  const data = await gcpGet(token, `${projectId}/instances`);
  const instances = data.items ?? [];

  await withConcurrency(instances, config.gcp.maxConcurrentInstances, async (inst) => {
    const settings = inst.settings ?? {};
    const backupConfig = settings.backupConfiguration ?? {};
    const labels = settings.userLabels ?? inst.userLabels ?? {};

    const ipPrimary = extractIp(inst.ipAddresses, 'PRIMARY');
    const ipOutgoing = extractIp(inst.ipAddresses, 'OUTGOING');
    const ipPrivate = extractIp(inst.ipAddresses, 'PRIVATE');

    // GCP returns state=RUNNABLE even for stopped instances;
    // the actual stopped status is in activationPolicy=NEVER.
    const effectiveState = settings.activationPolicy === 'NEVER' ? 'STOPPED' : (inst.state ?? 'UNKNOWN_STATE');

    const upsert = await query(
      `INSERT INTO csql_instances (
        project_id, instance_name, database_version, region, state, tier,
        ip_primary, ip_outgoing, ip_private, ip_label,
        environment, application, info, service_account,
        ha_enabled, backup_enabled, storage_size_gb, data_disk_type,
        labels_raw, synced_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT (project_id, instance_name) DO UPDATE SET
        database_version  = EXCLUDED.database_version,
        region            = EXCLUDED.region,
        state             = EXCLUDED.state,
        tier              = EXCLUDED.tier,
        ip_primary        = EXCLUDED.ip_primary,
        ip_outgoing       = EXCLUDED.ip_outgoing,
        ip_private        = EXCLUDED.ip_private,
        ip_label          = EXCLUDED.ip_label,
        environment       = EXCLUDED.environment,
        application       = EXCLUDED.application,
        info              = EXCLUDED.info,
        service_account   = EXCLUDED.service_account,
        ha_enabled        = EXCLUDED.ha_enabled,
        backup_enabled    = EXCLUDED.backup_enabled,
        storage_size_gb   = EXCLUDED.storage_size_gb,
        data_disk_type    = EXCLUDED.data_disk_type,
        labels_raw        = EXCLUDED.labels_raw,
        synced_at         = EXCLUDED.synced_at
      RETURNING id`,
      [
        projectId,
        inst.name,
        inst.databaseVersion,
        inst.region,
        effectiveState,
        settings.tier,
        ipPrimary,
        ipOutgoing,
        ipPrivate,
        labels.ip ?? null,
        labels.environment ?? null,
        labels.application ?? null,
        labels.info ?? null,
        inst.serviceAccountEmailAddress ?? null,
        settings.availabilityType === 'REGIONAL',
        backupConfig.enabled ?? false,
        settings.dataDiskSizeGb ? parseInt(settings.dataDiskSizeGb, 10) : null,
        settings.dataDiskType ?? null,
        labels,
        syncedAt,
      ]
    );

    const instanceId = upsert.rows[0].id;

    // La API rechaza listar BDs de una instancia que no está corriendo
    // ("instance is not running"). Se conserva la última lista conocida.
    if (effectiveState !== 'RUNNABLE') return;

    try {
      const dbData = await gcpGet(token, `${projectId}/instances/${inst.name}/databases`);
      const databases = dbData.items ?? [];

      const SYSTEM_DBS = new Set(['information_schema', 'performance_schema', 'mysql', 'sys', 'postgres', 'cloudsqladmin']);

      await withConcurrency(databases, 10, async (db) => {
        const isSystem = SYSTEM_DBS.has(db.name);
        await query(
          `INSERT INTO csql_databases (instance_id, database_name, charset, "collation", is_system, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (instance_id, database_name) DO UPDATE SET
             charset     = EXCLUDED.charset,
             "collation" = EXCLUDED."collation",
             is_system   = EXCLUDED.is_system,
             synced_at   = EXCLUDED.synced_at`,
          [instanceId, db.name, db.charset ?? null, db.collation ?? null, isSystem, syncedAt]
        );
      });

      // Las BDs que GCP ya no devuelve fueron eliminadas. Solo se limpia tras
      // un listado exitoso, para no vaciar la lista por un error transitorio.
      await query(
        `DELETE FROM csql_databases WHERE instance_id = $1 AND synced_at < $2`,
        [instanceId, syncedAt]
      );
    } catch (dbErr) {
      console.warn(`[SYNC] Could not list databases for ${projectId}/${inst.name}:`, dbErr.message);
    }
  });
}

export async function runSync() {
  const token = await getToken();
  const syncedAt = new Date();

  const logResult = await query(
    `INSERT INTO sync_log (started_at, status) VALUES ($1, 'running') RETURNING id`,
    [syncedAt]
  );
  const logId = logResult.rows[0].id;
  const startMs = Date.now();

  try {
    const projectsResult = await query(`SELECT project_id FROM gcp_projects WHERE is_active = true`);
    const projects = projectsResult.rows.map((r) => r.project_id);

    // Cada proyecto se resuelve en un resultado etiquetado: un fallo aislado no
    // debe tumbar el sync completo, pero sí tiene que quedar registrado.
    const projectResults = await withConcurrency(projects, config.gcp.maxConcurrentProjects, async (pid) => {
      console.log(`[SYNC] Syncing project: ${pid}`);
      try {
        await syncProject(token, pid, syncedAt);
        return { projectId: pid, ok: true };
      } catch (err) {
        console.error(`[SYNC] Project ${pid} failed:`, err.message);
        return {
          projectId: pid,
          ok: false,
          message: err.message,
          httpStatus: err.httpStatus ?? null,
          reason: err.reason ?? null,
        };
      }
    });

    const outcomes = projectResults.map((settled) =>
      settled.status === 'fulfilled'
        ? settled.value
        : { projectId: null, ok: false, message: settled.reason?.message ?? 'Error desconocido', httpStatus: null, reason: null }
    );

    const okProjects = outcomes.filter((o) => o.ok).map((o) => o.projectId);
    const failedProjects = outcomes
      .filter((o) => !o.ok)
      .map((o) => ({
        project_id: o.projectId,
        message: o.message,
        http_status: o.httpStatus,
        reason: o.reason,
      }));

    // Solo se marcan como DELETED las instancias de proyectos que SÍ se pudieron
    // leer; si un proyecto falló, sus instancias se dejan intactas.
    if (okProjects.length > 0) {
      await query(
        `UPDATE csql_instances SET state = 'DELETED'
         WHERE project_id = ANY($1::text[])
           AND synced_at < $2
           AND state <> 'DELETED'`,
        [okProjects, syncedAt]
      );
    }

    const counts = await query(
      `SELECT
        (SELECT COUNT(*)::int FROM csql_instances WHERE synced_at = $1) AS instances,
        (SELECT COUNT(*)::int FROM csql_databases d JOIN csql_instances i ON i.id = d.instance_id WHERE i.synced_at = $1) AS databases`,
      [syncedAt]
    );

    // success = todo bien | partial = algunos proyectos fallaron | failed = todos
    const status =
      failedProjects.length === 0 ? 'success' : okProjects.length === 0 ? 'failed' : 'partial';
    const errorMessage =
      failedProjects.length === 0
        ? null
        : `${failedProjects.length} de ${projects.length} proyectos fallaron: ${failedProjects[0].message}`;

    await query(
      `UPDATE sync_log SET
        finished_at = now(), status = $6, error_message = $7, failed_projects = $8::jsonb,
        projects_count = $2, instances_count = $3, databases_count = $4, duration_ms = $5
       WHERE id = $1`,
      [
        logId,
        projects.length,
        counts.rows[0].instances,
        counts.rows[0].databases,
        Date.now() - startMs,
        status,
        errorMessage,
        JSON.stringify(failedProjects),
      ]
    );

    invalidateSummaryCache();
    console.log(
      `[SYNC] Done (${status}) — ${okProjects.length}/${projects.length} projects, ${counts.rows[0].instances} instances` +
        (failedProjects.length ? `, ${failedProjects.length} failed` : '')
    );
    return {
      logId,
      status,
      projects: projects.length,
      instances: counts.rows[0].instances,
      databases: counts.rows[0].databases,
      failedProjects,
    };
  } catch (err) {
    await query(
      `UPDATE sync_log SET finished_at = now(), status = 'failed', error_message = $2, duration_ms = $3 WHERE id = $1`,
      [logId, err.message, Date.now() - startMs]
    );
    throw err;
  }
}

export async function getLastSyncStatus() {
  const result = await query(`SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 1`);
  return result.rows[0] ?? null;
}

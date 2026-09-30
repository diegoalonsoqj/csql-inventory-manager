import { query } from '../config/db.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { computeNextRunAt } from '../lib/sync-schedule.js';

const SA_KEY = 'gcp_service_account';
const TZ_KEY = 'timezone';

// Cache simple en memoria para no descifrar/consultar en cada sync.
let cache = null;

function invalidateCache() {
  cache = null;
}

async function loadAll() {
  if (cache) return cache;
  const result = await query('SELECT key, value, value_enc, is_secret, updated_at FROM app_settings');
  const map = {};
  for (const row of result.rows) map[row.key] = row;
  cache = map;
  return map;
}

async function setSetting(key, { value = null, valueEnc = null, isSecret = false, userId = null }) {
  await query(
    `INSERT INTO app_settings (key, value, value_enc, is_secret, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       value_enc = EXCLUDED.value_enc,
       is_secret = EXCLUDED.is_secret,
       updated_by = EXCLUDED.updated_by,
       updated_at = now()`,
    [key, value, valueEnc, isSecret, userId]
  );
  invalidateCache();
}

// ── Zona horaria ──────────────────────────────────────────────

export async function getTimezone() {
  const all = await loadAll();
  return all[TZ_KEY]?.value ?? 'America/Lima';
}

export async function setTimezone(tz, userId) {
  await setSetting(TZ_KEY, { value: tz, isSecret: false, userId });
}

// ── Cuenta de servicio GCP (cifrada) ──────────────────────────

/**
 * Valida la forma de un JSON de cuenta de servicio de GCP.
 * Devuelve el objeto parseado o lanza Error 400.
 */
export function parseAndValidateServiceAccount(raw) {
  let obj;
  try {
    obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    const err = new Error('El contenido no es un JSON válido');
    err.status = 400;
    throw err;
  }
  const missing = ['type', 'private_key', 'client_email', 'project_id'].filter((f) => !obj?.[f]);
  if (obj?.type !== 'service_account' || missing.length) {
    const err = new Error(
      `No parece una cuenta de servicio válida (faltan/incorrectos: ${missing.join(', ') || 'type'})`
    );
    err.status = 400;
    throw err;
  }
  return obj;
}

export async function setServiceAccount(raw, userId) {
  const obj = parseAndValidateServiceAccount(raw);
  // Se cifra el JSON completo (canonicalizado) antes de guardar.
  await setSetting(SA_KEY, { valueEnc: encrypt(JSON.stringify(obj)), isSecret: true, userId });
  return { client_email: obj.client_email, project_id: obj.project_id };
}

export async function clearServiceAccount(userId) {
  await setSetting(SA_KEY, { value: null, valueEnc: null, isSecret: true, userId });
}

/**
 * Devuelve el objeto SA descifrado, o null si no hay ninguna configurada.
 * Uso interno (nunca se expone al cliente).
 */
export async function getServiceAccountCredentials() {
  const all = await loadAll();
  const enc = all[SA_KEY]?.value_enc;
  if (!enc) return null;
  try {
    return JSON.parse(decrypt(enc));
  } catch (err) {
    console.error('[SETTINGS] No se pudo descifrar la cuenta de servicio:', err.message);
    return null;
  }
}

/**
 * Metadata segura de la SA para mostrar en la UI (sin private_key).
 */
export async function getServiceAccountInfo() {
  const sa = await getServiceAccountCredentials();
  if (!sa) return { configured: false };
  const all = await loadAll();
  return {
    configured: true,
    client_email: sa.client_email,
    project_id: sa.project_id,
    updated_at: all[SA_KEY]?.updated_at ?? null,
  };
}

// ── Active Directory ──────────────────────────────────────────

/**
 * Config AD: { enabled, url, domain, tlsVerify }. No hay secretos: el bind se
 * hace con las credenciales del propio usuario (DOMINIO\usuario).
 */
export async function getAdConfig() {
  const all = await loadAll();
  return {
    enabled: all.ad_enabled?.value === 'true',
    url: all.ad_url?.value ?? '',
    domain: all.ad_domain?.value ?? '',
    tlsVerify: all.ad_tls_verify?.value !== 'false',
  };
}

export async function setAdConfig({ enabled, url, domain, tlsVerify }, userId) {
  await setSetting('ad_enabled', { value: String(enabled), userId });
  await setSetting('ad_url', { value: url.trim(), userId });
  await setSetting('ad_domain', { value: domain.trim().toUpperCase(), userId });
  await setSetting('ad_tls_verify', { value: String(tlsVerify), userId });
}

// ── Sincronización automática ─────────────────────────────────

/**
 * Config del sync automático: { enabled, mode, intervalHours, times }.
 * mode 'interval' = cada intervalHours horas; 'schedule' = a las horas fijas
 * `times` ("HH:MM", en la zona horaria configurada).
 */
export async function getSyncSchedule() {
  const all = await loadAll();
  const times = (all.sync_times?.value ?? '08:00,14:00').split(',').filter(Boolean);
  return {
    enabled: all.sync_auto_enabled?.value === 'true',
    mode: all.sync_mode?.value === 'schedule' ? 'schedule' : 'interval',
    intervalHours: Number(all.sync_interval_hours?.value) || 6,
    times,
  };
}

export async function setSyncSchedule({ enabled, mode, intervalHours, times }, userId) {
  await setSetting('sync_auto_enabled', { value: String(enabled), userId });
  await setSetting('sync_mode', { value: mode, userId });
  await setSetting('sync_interval_hours', { value: String(intervalHours), userId });
  await setSetting('sync_times', { value: [...new Set(times)].sort().join(','), userId });
}

/**
 * Config + cuándo toca el próximo sync automático (null si está deshabilitado).
 */
async function getSyncScheduleWithNextRun() {
  const [schedule, tz, last] = await Promise.all([
    getSyncSchedule(),
    getTimezone(),
    query('SELECT started_at FROM sync_log ORDER BY started_at DESC LIMIT 1'),
  ]);
  if (!schedule.enabled) return { ...schedule, nextRunAt: null };
  const now = Date.now();
  const lastStart = last.rows[0] ? new Date(last.rows[0].started_at).getTime() : 0;
  // Si ya toca, el scheduler lo lanza en el próximo minuto.
  const next = Math.max(computeNextRunAt(schedule, lastStart, now, tz), now);
  return { ...schedule, nextRunAt: new Date(next).toISOString() };
}

/**
 * Settings completos y seguros para el panel de administración.
 */
export async function getSettingsForAdmin() {
  const [timezone, sa, ad, syncSchedule] = await Promise.all([
    getTimezone(),
    getServiceAccountInfo(),
    getAdConfig(),
    getSyncScheduleWithNextRun(),
  ]);
  return { timezone, gcpServiceAccount: sa, ad, syncSchedule };
}

/**
 * Settings públicos (para cualquier usuario autenticado): solo zona horaria.
 */
export async function getPublicSettings() {
  return { timezone: await getTimezone() };
}

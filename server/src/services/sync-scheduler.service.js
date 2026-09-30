import { getSyncSchedule, getTimezone } from './settings.service.js';
import { startSync, isSyncInProgress, getLastSyncStatus } from './gcp-sync.service.js';
import { computeNextRunAt } from '../lib/sync-schedule.js';

// Cada minuto se revisa si toca un sync automático según la config guardada
// (se lee en cada vuelta, así un cambio en Configuración aplica sin reiniciar).
const TICK_MS = 60_000;
// Si un sync falla antes de registrarse en sync_log (p. ej. sin credencial),
// no se reintenta en cada vuelta sino cada 15 minutos.
const RETRY_MS = 15 * 60_000;

let timer = null;
let lastAttemptAt = 0;

async function tick() {
  try {
    const schedule = await getSyncSchedule();
    if (!schedule.enabled || isSyncInProgress()) return;

    const now = Date.now();
    if (now - lastAttemptAt < RETRY_MS) return;

    const [last, tz] = await Promise.all([getLastSyncStatus(), getTimezone()]);
    const lastStart = last ? new Date(last.started_at).getTime() : 0;
    if (computeNextRunAt(schedule, lastStart, now, tz) > now) return;

    lastAttemptAt = now;
    console.log('[SCHEDULER] Iniciando sync automático');
    startSync('auto');
  } catch (err) {
    console.error('[SCHEDULER] Error:', err.message);
  }
}

export function startSyncScheduler() {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
  timer.unref();
  console.log('[SCHEDULER] Sync automático: revisión cada minuto');
}

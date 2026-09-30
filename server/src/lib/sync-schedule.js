// Cálculo del próximo sync automático. Sin dependencias (ni BD ni settings)
// para poder usarlo tanto en el scheduler como al mostrar la config.

const HOUR_MS = 3_600_000;

// Fecha/hora local en `tz` de un instante.
function localParts(ms, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), mi: get('minute'), s: get('second') };
}

// Instante (ms) de una fecha/hora local en `tz`.
function zonedToUtc(y, m, d, h, mi, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const p = localParts(guess, tz);
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - guess;
  return guess - offset;
}

/**
 * Devuelve el instante (ms) en que toca el próximo sync automático. Si es
 * <= now, ya toca.
 *
 * - interval: `intervalHours` después del último sync, sea manual o
 *   automático (si alguien sincronizó hace poco, el automático espera).
 * - schedule: a las horas fijas `times` ("HH:MM") en la zona horaria `tz`.
 *   Si se pasó un horario sin sync posterior (p. ej. el servidor estaba
 *   caído), toca ya: se recupera una sola vez.
 */
export function computeNextRunAt({ mode, intervalHours, times }, lastStartMs, nowMs, tz) {
  if (mode === 'interval') {
    return lastStartMs ? lastStartMs + intervalHours * HOUR_MS : nowMs;
  }

  const today = localParts(nowMs, tz);
  const slots = [];
  for (const offset of [-1, 0, 1]) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + offset));
    for (const t of times) {
      const [h, mi] = t.split(':').map(Number);
      slots.push(zonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), h, mi, tz));
    }
  }
  slots.sort((a, b) => a - b);

  const latestPast = slots.filter((s) => s <= nowMs).pop();
  if (latestPast !== undefined && lastStartMs < latestPast) return latestPast;
  return slots.find((s) => s > nowMs);
}

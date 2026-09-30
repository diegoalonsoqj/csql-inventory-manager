-- Sincronización automática programada (configurable en Configuración).
-- sync_log registra si cada corrida fue manual (botón) o automática.
-- Idempotente.

ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS triggered_by TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE sync_log DROP CONSTRAINT IF EXISTS sync_log_triggered_by_check;
ALTER TABLE sync_log ADD CONSTRAINT sync_log_triggered_by_check
    CHECK (triggered_by IN ('manual', 'auto'));

-- Arranca deshabilitada. No pisa valores existentes.
INSERT INTO app_settings (key, value, is_secret) VALUES
    ('sync_auto_enabled',   'false',       false),
    ('sync_mode',           'interval',    false),
    ('sync_interval_hours', '6',           false),
    ('sync_times',          '08:00,14:00', false)
ON CONFLICT (key) DO NOTHING;

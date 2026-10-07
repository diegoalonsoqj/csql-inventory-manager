-- Preferencia de apariencia por usuario (Configuración → Apariencia).
-- NULL = el usuario aún no eligió: el cliente usa el último tema del navegador.
-- Idempotente.

ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_theme TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_mode TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ui_theme_check;
ALTER TABLE users ADD CONSTRAINT users_ui_theme_check
    CHECK (ui_theme IS NULL OR ui_theme IN ('cyan', 'indigo', 'emerald'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ui_mode_check;
ALTER TABLE users ADD CONSTRAINT users_ui_mode_check
    CHECK (ui_mode IS NULL OR ui_mode IN ('dark', 'light', 'system'));

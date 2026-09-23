-- Configuración de la aplicación (key-value).
-- Los secretos (ej. cuenta de servicio GCP) se guardan cifrados en value_enc.
-- Idempotente: seguro de re-ejecutar.

CREATE TABLE IF NOT EXISTS app_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT,                       -- valor en texto plano (no secretos)
    value_enc   TEXT,                       -- valor cifrado AES-256-GCM (secretos)
    is_secret   BOOLEAN NOT NULL DEFAULT false,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Valor por defecto de zona horaria (Perú). No pisa un valor existente.
INSERT INTO app_settings (key, value, is_secret)
VALUES ('timezone', 'America/Lima', false)
ON CONFLICT (key) DO NOTHING;

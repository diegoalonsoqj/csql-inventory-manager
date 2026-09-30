-- Autenticación con Active Directory.
-- Cada usuario tiene un tipo: 'local' (contraseña bcrypt en la app) o 'ad'
-- (la contraseña se valida contra el directorio con un bind DOMINIO\usuario).
-- Los usuarios AD los da de alta un admin: un empleado del dominio sin alta
-- en la app no puede entrar aunque su contraseña sea correcta.
-- Idempotente.

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_type TEXT NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ad_username TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_type_check;
ALTER TABLE users ADD CONSTRAINT users_auth_type_check
    CHECK (auth_type IN ('local', 'ad'));

-- Los usuarios AD no tienen contraseña local y el correo es opcional.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_fields_check;
ALTER TABLE users ADD CONSTRAINT users_auth_fields_check CHECK (
    (auth_type = 'local' AND password_hash IS NOT NULL AND email IS NOT NULL)
    OR (auth_type = 'ad' AND ad_username IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_ad_username_lower
    ON users (lower(ad_username)) WHERE ad_username IS NOT NULL;

-- Config AD por defecto (editable en Configuración). Arranca deshabilitada
-- hasta que un admin la pruebe y la active. No pisa valores existentes.
INSERT INTO app_settings (key, value, is_secret) VALUES
    ('ad_enabled',    'false',                false),
    ('ad_url',        'ldap://126.26.3.151',  false),
    ('ad_domain',     'INTERSEGURO',          false),
    ('ad_tls_verify', 'true',                 false)
ON CONFLICT (key) DO NOTHING;

-- Agrega el rol 'operator' a la restricción de roles de users.
-- operator: puede ver y gestionar proyectos, ejecutar sync y exportar,
-- pero NO puede gestionar usuarios ni modificar settings.
-- Idempotente.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'operator', 'viewer'));

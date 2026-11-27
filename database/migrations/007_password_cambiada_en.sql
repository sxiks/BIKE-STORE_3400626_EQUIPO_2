-- =====================================================================
-- 007_password_cambiada_en.sql
-- Bike Store - cerrar las sesiones abiertas al restablecer la contrasena (auditoria H-04).
-- PostgreSQL 15+. Ejecutar conectado a la base, DESPUES de la 006.
--
--   - password_cambiada_en : momento del ultimo restablecimiento de contrasena (CU-11).
--                            NULL = nunca se ha restablecido. La fija auth.services con el
--                            reloj del backend, el mismo que firma los tokens.
--   - El middleware de autenticacion rechaza con 401 SESION_REVOCADA los tokens emitidos
--     antes de ese momento, aunque no hayan vencido.
-- Agregar una columna que admite NULL no reescribe la tabla ni cambia las filas existentes.
-- No se puede ejecutar dos veces (ADD COLUMN fallaria): se aplica una sola vez por base.
-- =====================================================================
BEGIN;

ALTER TABLE usuarios
    ADD COLUMN password_cambiada_en TIMESTAMPTZ NULL;

COMMENT ON COLUMN usuarios.password_cambiada_en IS
    'Ultimo restablecimiento de contrasena. Los tokens emitidos antes se rechazan (401 SESION_REVOCADA).';

COMMIT;

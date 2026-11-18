# legacy_mysql · histórico, NO se ejecuta

`001_base_usuarios_equipos.sql` es la migración original del proyecto cuando usaba MySQL/MariaDB.

- Está en sintaxis MySQL (`AUTO_INCREMENT`, `ENUM` dentro de la tabla, `USE`) y **falla en PostgreSQL**.
- Se conserva sin editar para respetar la regla de no modificar migraciones ya integradas y para dejar trazabilidad del cambio de motor.
- El modelo vigente empieza en `../002_modelo_bike_store.sql`.

**Nadie debe ejecutar este archivo.**

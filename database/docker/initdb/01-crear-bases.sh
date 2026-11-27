#!/bin/sh
# Inicializa la base de datos local de Bike Store dentro del contenedor (decisión D13).
# La imagen oficial de PostgreSQL ejecuta este archivo UNA SOLA VEZ: cuando el volumen
# de datos está vacío. Variables (de docker-compose.yml): POSTGRES_USER, APP_DB_USER,
# APP_DB_PASSWORD.
set -e

echo "[bike-store] Creando el rol ${APP_DB_USER} y las bases bike_store y bike_store_test..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v rol="$APP_DB_USER" -v clave="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE :"rol" WITH LOGIN PASSWORD :'clave';
CREATE DATABASE bike_store OWNER :"rol";
CREATE DATABASE bike_store_test OWNER :"rol";
ALTER DATABASE bike_store SET timezone TO 'America/Bogota';
ALTER DATABASE bike_store_test SET timezone TO 'America/Bogota';
SQL

# Migraciones en orden, con el rol de la aplicación (igual que en la instalación sin Docker).
# Durante la inicialización el servidor solo escucha por el socket local, por eso no se usa --host.
# La 004 va sola: agrega un valor al ENUM que la 005 usa. bike_store_test queda vacía:
# npm run test:db la prepara.
for archivo in \
  002_modelo_bike_store.sql \
  003_datos_semilla.sql \
  004_estado_pedido_carrito.sql \
  005_carrito_como_pedido.sql \
  006_producto_imagenes.sql
do
  echo "[bike-store] Aplicando ${archivo}..."
  psql -v ON_ERROR_STOP=1 \
    --username "$APP_DB_USER" --dbname bike_store --file "/migraciones/${archivo}"
done

echo "[bike-store] Listo: base bike_store con las migraciones 002 a 006."

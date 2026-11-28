# Base de datos · migraciones

## ¿Qué es una migración y por qué las usamos?

Una **migración** es un archivo SQL numerado que describe **un cambio** en la estructura de la base de datos: crear tablas, agregar una columna, crear un índice, cargar datos iniciales. En lugar de tener un único `schema.sql` que todos editan, la historia de la base queda como una lista ordenada de cambios:

```
002_modelo_bike_store.sql       ← crea todas las tablas
003_datos_semilla.sql           ← carga categorías y productos de ejemplo
004_estado_pedido_carrito.sql   ← agrega el estado 'carrito' a estado_pedido
005_carrito_como_pedido.sql     ← el carrito pasa a ser un pedido en estado 'carrito'
006_producto_imagenes.sql       ← galería: imágenes adicionales de cada producto
007_password_cambiada_en.sql    ← fecha del último restablecimiento de contraseña (cierra sesiones)
```

**Por qué conviene en este proyecto:**

1. **Los dos PCs quedan iguales.** El Dev Backend y el Dev Frontend tienen cada uno su propia base local. Si los dos aplican las mismas migraciones en el mismo orden, sus bases son idénticas, y un error no depende de "en mi PC sí funciona".
2. **Git versiona la base de datos igual que el código.** Cada cambio de esquema llega en un PR, se revisa y queda en el historial: quién lo hizo, cuándo y por qué.
3. **Se aplica solo lo nuevo.** Cuando exista la `004`, cada integrante ejecuta **solo la 004** sobre su base, sin borrar nada ni perder sus datos de prueba. Con un único `schema.sql` habría que borrar la base y crearla de nuevo cada vez.
4. **El despliegue es predecible.** El servidor de producción recibirá exactamente los mismos archivos, en el mismo orden, que ya se probaron en local.

**Las dos reglas:**

- **Nunca se edita una migración que ya está en `develop`.** Otros ya la ejecutaron. Si la cambias, su base y la tuya dejan de coincidir sin que nadie lo note. Para corregir algo se crea una migración nueva.
- **El número sube siempre:** `004`, `005`… Quien crea una migración la anuncia en el PR para que el otro integrante la aplique.

Por eso la antigua `001` (MySQL) no se borró ni se editó: quedó en `legacy_mysql/` como histórico y **no se ejecuta**.

## ¿Por qué no hay un "ejecutor" automático?

Herramientas como `node-pg-migrate`, Knex o Flyway guardan en una tabla qué migraciones ya se aplicaron y ejecutan solo las pendientes. Para dos personas y pocos archivos, aplicarlas a mano con `psql` es más simple y enseña qué pasa realmente. Se puede agregar un ejecutor en la fase de despliegue (ver `docs/ROADMAP.md`, Sprint 5).

Consecuencia práctica: la `002` **no se puede ejecutar dos veces** sobre la misma base, porque `CREATE TYPE` fallaría. La `003` y la `004` sí se pueden repetir sin efecto. La `005` no: falla porque las tablas `carritos` y `carrito_items` ya no existen.

## Con Docker

Es la forma principal (decisión D13 del [ROADMAP](../docs/ROADMAP.md#resueltas)). `docker-compose.yml`, en la raíz, levanta PostgreSQL 17 en el puerto **5433**, accesible solo desde el mismo PC. Las contraseñas salen del `.env` de la raíz (copia de `.env.example`, no se sube a GitHub). La primera vez que se crea el volumen de datos, `docker/initdb/01-crear-bases.sh` crea el rol `bike_store_app`, las bases `bike_store` y `bike_store_test`, y aplica de la `002` a la `007` sobre `bike_store`. Los pasos completos están en la [GUIA_EJECUCION_LOCAL](../docs/GUIA_EJECUCION_LOCAL.md#4-levantar-la-base-de-datos-con-docker). Desde la raíz del repositorio:

```bash
cp .env.example .env                 # una sola vez: elige POSTGRES_PASSWORD (y DB_PASSWORD si quieres otra)
docker compose up -d                 # arranca la base (la primera vez, la crea y aplica las migraciones)
docker compose logs db               # qué pasó al iniciar

# Consola psql dentro del contenedor (no necesitas psql instalado)
docker compose exec db psql -U bike_store_app -d bike_store

# Aplicar una migración NUEVA sin borrar datos (ejemplo con la 007)
docker compose exec -T db psql -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f /migraciones/007_password_cambiada_en.sql

# Empezar de cero: BORRA todos los datos y vuelve a crear todo
docker compose down -v
docker compose up -d
```

La carpeta `migrations/` está montada en el contenedor como `/migraciones` (solo lectura), por eso un archivo nuevo se puede aplicar sin copiarlo.

## Sin Docker: cómo aplicarlas (primera vez)

Los pasos completos, incluida la instalación de PostgreSQL, están en el [anexo de la GUIA_EJECUCION_LOCAL](../docs/GUIA_EJECUCION_LOCAL.md#anexo-alternativa-sin-docker), con comandos para Linux y Windows. Resumen, desde la raíz del repositorio:

```bash
# 1. Crear el rol de la aplicación y la base (una sola vez, como superusuario postgres)
sudo -u postgres psql -c "CREATE ROLE bike_store_app WITH LOGIN PASSWORD 'cambia_esta_clave';"
sudo -u postgres psql -c "CREATE DATABASE bike_store OWNER bike_store_app;"
sudo -u postgres psql -c "ALTER DATABASE bike_store SET timezone TO 'America/Bogota';"

# 2. Aplicar las migraciones EN ORDEN, con el rol de la aplicación
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/002_modelo_bike_store.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/003_datos_semilla.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/004_estado_pedido_carrito.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/005_carrito_como_pedido.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/006_producto_imagenes.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/007_password_cambiada_en.sql
```

`-v ON_ERROR_STOP=1` detiene el archivo en el primer error en lugar de seguir a medias.

## Sin Docker: cómo empezar de cero (solo en desarrollo)

Con Docker, ver la sección [Con Docker](#con-docker). Sin Docker, mientras no haya datos reales, si la base queda en mal estado se puede recrear:

```bash
sudo -u postgres psql -c "DROP DATABASE IF EXISTS bike_store;"
# ...y repetir los pasos 1 (desde CREATE DATABASE) y 2
```

## Cómo agregar una migración nueva (Dev Backend)

1. Crear `database/migrations/00N_descripcion_corta.sql`, con el siguiente número libre.
2. Envolverla en `BEGIN; ... COMMIT;` para que se aplique completa o no se aplique.
   - **Excepción: agregar un valor a un ENUM** (`ALTER TYPE ... ADD VALUE`). PostgreSQL no permite usar el valor nuevo en la misma transacción en que se agrega. Va sola, en su propio archivo y sin `BEGIN`, y la migración siguiente lo usa (ejemplo: `004` y `005`).
3. Probarla en tu base local.
4. Agregarla a la lista de `docker/initdb/01-crear-bases.sh` (para las bases nuevas de Docker) y a `MIGRACIONES` en `backend/scripts/preparar-db-test.js` (para la base de pruebas).
5. Abrir el PR indicando en la descripción: "**Requiere aplicar la migración 00N**".
6. Tras el merge, cada integrante aplica solo ese archivo: con Docker, `docker compose exec -T db psql ... -f /migraciones/00N_....sql` (ver [Con Docker](#con-docker)); sin Docker, con `psql`.

## Archivos

| Archivo | Contenido |
|---------|-----------|
| `migrations/002_modelo_bike_store.sql` | Tipos ENUM, las 9 tablas iniciales, índices, el trigger del número de pedido |
| `migrations/003_datos_semilla.sql` | 5 categorías y 10 productos de ejemplo (uno con stock bajo, uno agotado y uno inactivo) |
| `migrations/004_estado_pedido_carrito.sql` | Agrega `carrito` al ENUM `estado_pedido`. Va sola y sin transacción (ver la excepción de arriba) |
| `migrations/005_carrito_como_pedido.sql` | El carrito pasa a ser un pedido en estado `carrito` (decisión D12): `fecha_pedido`, columnas de envío y número opcionales mientras es carrito, CHECK `ck_pedidos_confirmado`, índice único parcial de un carrito por cliente, trigger que numera al confirmar, conversión de los carritos existentes y eliminación de `carritos` y `carrito_items`. Quedan 7 tablas |
| `migrations/006_producto_imagenes.sql` | Tabla `producto_imagenes` (decisión M): imágenes adicionales de cada producto, con su `orden`, y `ON DELETE CASCADE` hacia `productos`. La portada sigue en `productos.imagen`. Quedan 8 tablas |
| `migrations/007_password_cambiada_en.sql` | Columna `usuarios.password_cambiada_en` (auditoría H-04): la fija el restablecimiento de contraseña y el backend rechaza con 401 `SESION_REVOCADA` los tokens emitidos antes. Admite NULL, así que no cambia las filas existentes |
| `migrations/legacy_mysql/` | Migración original en MySQL. Histórico, **no se ejecuta** |
| `docker/initdb/01-crear-bases.sh` | Inicialización del contenedor de Docker: rol, bases `bike_store` y `bike_store_test`, y migraciones 002 a 007. Corre solo cuando el volumen está vacío |

El modelo completo (MER, MR y decisiones) está en [MODELO_DATOS](../docs/diseno-tecnico/MODELO_DATOS.md) y su justificación en [JUSTIFICACION_MODELO_DATOS](../docs/diseno-tecnico/JUSTIFICACION_MODELO_DATOS.md).

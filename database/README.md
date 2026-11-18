# Base de datos · migraciones

## ¿Qué es una migración y por qué las usamos?

Una **migración** es un archivo SQL numerado que describe **un cambio** en la estructura de la base de datos: crear tablas, agregar una columna, crear un índice, cargar datos iniciales. En lugar de tener un único `schema.sql` que todos editan, la historia de la base queda como una lista ordenada de cambios:

```
002_modelo_bike_store.sql   ← crea todas las tablas
003_datos_semilla.sql       ← carga categorías y productos de ejemplo
004_...                     ← (futuro) por ejemplo, agregar una columna
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

Consecuencia práctica: la `002` **no se puede ejecutar dos veces** sobre la misma base, porque `CREATE TYPE` fallaría. La `003` sí se puede repetir sin duplicar datos.

## Cómo aplicarlas (primera vez)

Los pasos completos, incluida la instalación de PostgreSQL, están en `docs/GUIA_DESARROLLO_LOCAL.md`. Resumen, desde la raíz del repositorio:

```bash
# 1. Crear el rol de la aplicación y la base (una sola vez, como superusuario postgres)
sudo -u postgres psql -c "CREATE ROLE bike_store_app WITH LOGIN PASSWORD 'cambia_esta_clave';"
sudo -u postgres psql -c "CREATE DATABASE bike_store OWNER bike_store_app;"
sudo -u postgres psql -c "ALTER DATABASE bike_store SET timezone TO 'America/Bogota';"

# 2. Aplicar las migraciones EN ORDEN, con el rol de la aplicación
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/002_modelo_bike_store.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/003_datos_semilla.sql
```

`-v ON_ERROR_STOP=1` detiene el archivo en el primer error en lugar de seguir a medias.

## Cómo empezar de cero (solo en desarrollo)

Mientras no haya datos reales, si la base queda en mal estado se puede recrear:

```bash
sudo -u postgres psql -c "DROP DATABASE IF EXISTS bike_store;"
# ...y repetir los pasos 1 (desde CREATE DATABASE) y 2
```

## Cómo agregar una migración nueva (Dev Backend)

1. Crear `database/migrations/00N_descripcion_corta.sql`, con el siguiente número libre.
2. Envolverla en `BEGIN; ... COMMIT;` para que se aplique completa o no se aplique.
3. Probarla en tu base local.
4. Abrir el PR indicando en la descripción: "**Requiere aplicar la migración 00N**".
5. Tras el merge, cada integrante ejecuta solo ese archivo con `psql`.

## Archivos

| Archivo | Contenido |
|---------|-----------|
| `migrations/002_modelo_bike_store.sql` | Tipos ENUM, las 9 tablas, índices, el trigger del número de pedido |
| `migrations/003_datos_semilla.sql` | 5 categorías y 10 productos de ejemplo (uno con stock bajo, uno agotado y uno inactivo) |
| `migrations/legacy_mysql/` | Migración original en MySQL. Histórico, **no se ejecuta** |

El modelo completo (MER, MR y decisiones) está en `docs/MODELO_DATOS.md`.

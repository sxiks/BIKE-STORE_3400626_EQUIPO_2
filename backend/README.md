# Bike Store · Backend

API REST con Express 5, PostgreSQL (`pg`), bcrypt, JWT y roles `admin` / `cliente`.
Arquitectura en capas: `routes → middlewares → controllers → services → repositories → PostgreSQL` (ver [ARQUITECTURA](../docs/diseno-tecnico/ARQUITECTURA.md)).

## Puesta en marcha

1. Levantar la base de datos con Docker desde la raíz del repositorio (`docker compose up -d`): pasos 4 y 5 de la [GUIA_EJECUCION_LOCAL](../docs/GUIA_EJECUCION_LOCAL.md#4-levantar-la-base-de-datos-con-docker). Crea el rol, las bases y aplica las migraciones. Sin Docker: [anexo de la guía](../docs/GUIA_EJECUCION_LOCAL.md#anexo-alternativa-sin-docker).
2. Variables de entorno:
   ```bash
   cp .env.example .env
   ```
   Los valores de ejemplo coinciden con la guía. Cambia `JWT_SECRET` y las contraseñas en tu `.env` real.
3. Instalar y ejecutar:
   ```bash
   npm install
   npm run dev        # node --watch → http://localhost:3000
   ```
   `npm run dev` usa `node --watch`, incluido en Node: reinicia la API al guardar un archivo de código. Un cambio en `.env` necesita reiniciarla a mano (Ctrl+C y `npm run dev`).

Al arrancar, la API comprueba la conexión a PostgreSQL y crea el admin de `ADMIN_*` si no existe. La carpeta `uploads/productos/` se crea sola y está ignorada por Git.

## Pruebas automatizadas

Vitest + Supertest (requiere Node.js 22.12 o superior). Las pruebas llaman a la app directamente (sin abrir el puerto 3000), así que pueden correr con la API encendida. Usan **su propia base**, `bike_store_test`, y **borran sus datos** en cada ejecución: nunca tocan `bike_store`.

**Con Docker** la base `bike_store_test` ya existe: el contenedor la crea junto con `bike_store`. Pasa directo a "Luego, dentro de `backend/`".

**Sin Docker**, créala una sola vez por PC (como en el [anexo de la GUIA_EJECUCION_LOCAL](../docs/GUIA_EJECUCION_LOCAL.md#anexo-alternativa-sin-docker)):

```bash
# Linux
sudo -u postgres psql -c "CREATE DATABASE bike_store_test OWNER bike_store_app;"
sudo -u postgres psql -c "ALTER DATABASE bike_store_test SET timezone TO 'America/Bogota';"
```
```powershell
# Windows (PowerShell): pide la contraseña de postgres
psql -U postgres -c "CREATE DATABASE bike_store_test OWNER bike_store_app;"
psql -U postgres -c "ALTER DATABASE bike_store_test SET timezone TO 'America/Bogota';"
```

Luego, dentro de `backend/`:

```bash
cp .env.test.example .env.test      # Windows: Copy-Item .env.test.example .env.test
# sin Docker: DB_PORT=5432 y, si tu rol usa otra contraseña, ajústala en DB_PASSWORD
npm run test:db                     # deja la base de pruebas con las migraciones 002 a 006
```

**Cada vez que pruebes:**

```bash
npm test             # corre todas las pruebas una vez
npm run test:watch   # las repite al guardar cambios
```

- Si cambian las migraciones (o la base de pruebas quedó en mal estado), vuelve a ejecutar `npm run test:db`. El script aplica de la `002` a la `005`.
- Protección: si `.env.test` no existe o su `DB_NAME` no termina en `_test`, las pruebas y `test:db` se niegan a ejecutarse.
- Las pruebas están en `tests/`: un archivo por módulo (`auth.test.js`, `carrito-pedido.test.js`, …) y utilidades en `tests/helpers/`.

## Estructura

```
src/
  config/        env.js (valida variables), db.js (Pool de pg), uploads.js (carpetas de imágenes)
  routes/        auth, usuarios, categorias, productos, carrito, pedidos, dashboard
  middlewares/   auth (JWT + estado/rol en BD), upload (multer), error
  controllers/   HTTP ↔ servicios
  services/      reglas de negocio y transacciones
  repositories/  SQL (único lugar con acceso a la BD) + transaction.js
  startup/       seedAdmin.js
  utils/         AppError, jwt, validators, respuesta
scripts/         preparar-db-test.js (npm run test:db)
tests/           pruebas automatizadas (Vitest + Supertest) y helpers/
```

## Endpoints

Contratos completos en [API_CONTRATOS](../docs/diseno-tecnico/API_CONTRATOS.md).

| Módulo | Rutas |
|--------|-------|
| Públicas | `GET /api/health` · `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/recuperar` · `POST /api/auth/restablecer` · `GET /api/categorias` · `GET /api/productos` · `GET /api/productos/:id` |
| Con sesión | `GET /api/auth/me` · `GET /api/pedidos/:numero` (dueño o admin) |
| Cliente | `GET/POST/PUT/DELETE /api/carrito…` · `POST /api/pedidos` · `GET /api/pedidos` · `POST /api/pedidos/:id/pagos` |
| Admin | `GET /api/usuarios` · `PATCH /api/usuarios/:id/rol` · `PATCH /api/usuarios/:id/estado` · `GET /api/productos/admin` · `GET /api/productos/admin/:id` · `POST /api/productos` · `PUT /api/productos/:id` · `PATCH /api/productos/:id/estado` · `GET /api/dashboard/metricas` · `GET /api/dashboard/alertas` |

Pendiente: exportación del tablero (CU-18, decisión D11), por implementar en el Sprint 4.

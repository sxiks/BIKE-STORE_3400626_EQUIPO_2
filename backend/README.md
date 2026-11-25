# Bike Store · Backend

API REST con Express 5, PostgreSQL (`pg`), bcrypt, JWT y roles `admin` / `cliente`.
Arquitectura en capas: `routes → middlewares → controllers → services → repositories → PostgreSQL` (ver [ARQUITECTURA](../docs/diseno-tecnico/ARQUITECTURA.md)).

## Puesta en marcha

1. Crear la base y aplicar las migraciones: pasos 4 y 5 de la [GUIA_EJECUCION_LOCAL](../docs/GUIA_EJECUCION_LOCAL.md#4-crear-el-rol-y-la-base-de-datos).
2. Variables de entorno:
   ```bash
   cp .env.example .env
   ```
   Los valores de ejemplo coinciden con la guía. Cambia `JWT_SECRET` y las contraseñas en tu `.env` real.
3. Instalar y ejecutar:
   ```bash
   npm install
   npm run dev        # con nodemon → http://localhost:3000
   ```

Al arrancar, la API comprueba la conexión a PostgreSQL y crea el admin de `ADMIN_*` si no existe. La carpeta `uploads/productos/` se crea sola y está ignorada por Git.

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
```

## Endpoints

Contratos completos en [API_CONTRATOS](../docs/diseno-tecnico/API_CONTRATOS.md).

| Módulo | Rutas |
|--------|-------|
| Públicas | `GET /api/health` · `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/recuperar` · `POST /api/auth/restablecer` · `GET /api/categorias` · `GET /api/productos` · `GET /api/productos/:id` |
| Con sesión | `GET /api/auth/me` · `GET /api/pedidos/:numero` (dueño o admin) |
| Cliente | `GET/POST/PUT/DELETE /api/carrito…` · `POST /api/pedidos` · `GET /api/pedidos` · `POST /api/pedidos/:id/pagos` |
| Admin | `GET /api/usuarios` · `PATCH /api/usuarios/:id/rol` · `PATCH /api/usuarios/:id/estado` · `GET /api/productos/admin` · `GET /api/productos/admin/:id` · `POST /api/productos` · `PUT /api/productos/:id` · `PATCH /api/productos/:id/estado` · `GET /api/dashboard/metricas` · `GET /api/dashboard/alertas` |

Pendiente: exportación del tablero (CU-18, decisión D11).

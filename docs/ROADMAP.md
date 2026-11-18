# Roadmap · Bike Store

## Estado general

- **Backend:** implementado para los CU-01 a CU-22 sobre PostgreSQL, salvo la exportación de CU-18 (D11). Cada sprint de backend consiste en **revisar, probar y ajustar** lo ya construido, y en terminar lo pendiente.
- **Frontend:** la tienda funciona con datos simulados, y el login y el registro ya están conectados a la API. El resto de pantallas se construye en los sprints.
- **Base de datos:** el modelo está aprobado (`docs/MODELO_DATOS.md`) y las migraciones 002 y 003 están verificadas.

## Sprints

| Sprint | RF · CU | Backend (Dev Backend) | Frontend (Dev Frontend) |
|--------|---------|-----------------------|-------------------------|
| **0 · Base** | – | Fusión, cambio a PostgreSQL, modelo, API completa | Fusión Lab + Carrito; login conectado a la API |
| **1 · Autenticación y seguridad** | RF-13–16, RF-27–31 · CU-09, 10, 11, 19, 20, 21, 22 | Revisar `auth` y `usuarios`; agregar pruebas automatizadas de la API (recomendado: Vitest + Supertest con una base de pruebas) | Navbar unificada con sesión (iniciar/cerrar sesión, rol); `ProtectedRoute` por rol; pantallas de recuperar y restablecer contraseña (§7 de `GUIA_DESARROLLO_LOCAL.md`); panel de usuarios (buscar, cambiar rol y estado); manejo de `CUENTA_DESACTIVADA` |
| **2 · Catálogo y productos** | RF-01–04, RF-17–20 · CU-01, 02, 12–15 | Revisar `productos`; decidir L (imágenes de la semilla) | Catálogo desde `GET /productos` (reemplaza `data/productos.js`), filtro por categoría, orden por precio, imagen de reemplazo; panel admin de productos (listar, crear con imagen, editar, inactivar); un solo sistema de diseño |
| **3 · Carrito y checkout** | RF-05–12 · CU-03–08 | Revisar `carrito` y `pedidos` (flujo de pago y stock) | `CarritoContext` conectado a `/carrito`, con avisos de no disponibles (D4); checkout con dirección; pago con manejo de 402/409; confirmación; "mis pedidos". Adaptar las 12 pruebas actuales. |
| **4 · Informes y tablero** | RF-21–26 · CU-16–18 | Resolver **D11** e implementar la exportación | Tablero: métricas con filtros de fecha y categoría, más vendidos, alertas; botón de exportar |
| **5 · Despliegue** (abierto) | RNF | Ver la tabla siguiente | Build de producción; `VITE_API_URL` apuntando a la API publicada |

### Sprint 5 · Despliegue (punto abierto, por definir)

| Tema | A decidir |
|------|-----------|
| Hosting | Dónde se publican la API, la base PostgreSQL y el frontend (ej. un servicio con PostgreSQL gestionado para la API y Vercel/Netlify para el frontend) |
| Migraciones | Adoptar un ejecutor automático (`node-pg-migrate` u otro) o aplicarlas con `psql` contra la base de producción |
| Correo | Enviar el token de recuperación por correo (SMTP o un servicio transaccional). En producción el token nunca va en la respuesta. |
| Imágenes | Disco del servidor o almacenamiento de objetos (el disco de muchos hostings se borra en cada despliegue) |
| Seguridad | `NODE_ENV=production`, `JWT_SECRET` fuerte, `CORS_ORIGIN` con el dominio real, HTTPS, copias de seguridad de la base |

## Decisiones

### Resueltas

| # | Decisión | Dónde se aplica |
|---|----------|-----------------|
| D1 | El carrito exige sesión | `carritos.id_usuario NOT NULL`; `/carrito` con `authenticate` |
| D2 | La cantidad 0 se rechaza y se ofrece eliminar | `CANTIDAD_MINIMA` en `carrito.services` |
| D3 | El carrito se guarda en la base, por cliente | Tablas `carritos` y `carrito_items` |
| D4 | Un producto inactivo queda en el carrito, marcado, y bloquea la compra | `motivo: INACTIVO`, `puede_comprar`, `CARRITO_NO_DISPONIBLE` |
| D5 / D6 | Un admin no puede cambiarse su propio rol ni desactivarse | `ACCION_SOBRE_SI_MISMO` en `usuarios.services` |
| D7 | Contraseña de mínimo 8 caracteres, con mayúscula, minúscula y número | `validators.validarPassword` (registro, restablecer y admin inicial) |
| D8 | Token de recuperación: 30 min, un solo uso, SHA-256; por consola y, en desarrollo, también en la respuesta | `auth.services`, `RESET_TOKEN_*` |
| D9 | Del pago solo se guardan los últimos 4 dígitos | `pagos.ultimos4` |
| D10 | El stock se descuenta al confirmar el pago, en una transacción | `pedidos.services.pagar` |
| A / B | Base regenerada sin ramas; módulo `equipos` retirado | Fase 0 (segunda entrega) |
| D (pago) | Un número terminado en `0000` simula un rechazo | `pedidos.services` |
| E | El stock se valida, con los productos bloqueados, **antes** de simular el pago; si falta, 409 y no se registra ningún pago | `pedidos.services.pagar` |
| F | Un pedido `fallido` se puede volver a pagar | `pedidos.services.pagar` |
| G | Estado y rol se verifican en la base en cada petición | `auth.middleware.authenticate` |
| H | Migraciones aplicadas a mano con `psql` (ver `database/README.md`) | `database/` |
| I | NUMERIC e INT8 se convierten a `Number` | `config/db.js` |
| J | Zona horaria America/Bogota en la base y en el pool | `ALTER DATABASE`, `DB_TIMEZONE` |
| K | Carrito y pago, solo para el rol `cliente` (aplicada por defecto; se cambia en una línea de cada ruta) | `carrito.routes`, `pedidos.routes` |

### Pendientes

| # | Pregunta | Sprint |
|---|----------|--------|
| L | Imágenes de la semilla: ¿imágenes de ejemplo en el repositorio, o solo imagen de reemplazo en el frontend? | 2 |
| D11 | ¿Dónde se generan Excel y PDF? Propuesta: en el backend (`exceljs`/`pdfkit`); el frontend solo descarga | 4 |
| — | Todo el Sprint 5 (despliegue) | 5 |

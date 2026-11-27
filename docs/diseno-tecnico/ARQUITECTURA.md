# Arquitectura en capas · Bike Store

> **Para qué sirve:** explica cómo está organizado el código en [capas](../GLOSARIO.md#arquitectura-capas) y qué puede importar cada una.
> **Cuándo usarlo:** antes de crear un archivo nuevo, y antes de abrir un PR (comprobación de la sección 2).
> ← Volver al [índice de la documentación](../README.md) · Términos desconocidos: [GLOSARIO](../GLOSARIO.md)

## 1. Vista general

```
┌──────────────────────────── frontend/ (Capa de Presentación) ────────────────────────────┐
│ pages/ → components/ → context/ + hooks/ → services/ (api.js) ──── fetch JSON + Bearer JWT─┼──┐
└───────────────────────────────────────────────────────────────────────────────────────────┘  │
┌──────────────────────────── backend/src/ ─────────────────────────────────────────────────┐  │
│ routes/        Capa API: URL + verbo + middlewares                              ◄──────────┼──┘
│ middlewares/   Seguridad transversal: authenticate (JWT + estado/rol en BD), authorize,    │
│                upload (multer), errorHandler                                               │
│ controllers/   Capa API: traduce HTTP ↔ negocio (lee req, responde res). Sin reglas.      │
│ services/      Capa de Negocio: reglas, validaciones, cálculos, transacciones. Sin SQL.    │
│ repositories/  Capa de Acceso a Datos: único lugar con SQL (pg, parámetros $1, $2…).      │
│ config/        env.js (valida .env), db.js (Pool de pg), uploads.js (carpetas)            │
└─────────────────────────────────────────────────────────────────────────────┬─────────────┘
                                                                              ▼
                                                   PostgreSQL 15+  (database/migrations)
```

## 2. Regla de dependencia (obligatoria)

Cada capa **solo** importa a la capa inmediatamente inferior ([regla de dependencia](../GLOSARIO.md#regla-dependencia)). Qué hace cada capa: [ruta](../GLOSARIO.md#ruta), [middleware](../GLOSARIO.md#middleware), [controlador](../GLOSARIO.md#controlador), [servicio](../GLOSARIO.md#servicio), [repositorio](../GLOSARIO.md#repositorio-capa).

| Capa | Puede importar | NO puede importar |
|------|----------------|-------------------|
| `routes` | `controllers`, `middlewares` | `services`, `repositories`, `db` |
| `middlewares` | `services` (ej. `authenticate` → `usuarios.services`), `config`, `utils` | `repositories`, `db` |
| `controllers` | `services`, `utils/respuesta` | `repositories`, `db` |
| `services` | otros `services`, `repositories` (incluido `transaction.js`), `config`, `utils` | `req`, `res`, `db`, SQL, `middlewares` |
| `repositories` | `config/db` | `AppError` de negocio, `req/res` |

Comprobación rápida antes de abrir un PR (ninguna línea debe imprimir nada):

```bash
grep -rn "config/db" backend/src --include=*.js | grep -v repositories/
grep -rnE "\breq\.|\bres\." backend/src/services backend/src/repositories
grep -rn "middlewares" backend/src/services
```

## 3. Convenciones del backend

- **Nombres de archivo:** `<modulo>.routes.js`, `<modulo>.controller.js`, `<modulo>.services.js`, `<modulo>.repository.js`.
- **Respuesta HTTP uniforme:** éxito `{ ok: true, data?, message? }` con `utils/respuesta.ok()`; error `{ ok: false, message, code?, data? }`. Ver [API_CONTRATOS](API_CONTRATOS.md#formato-de-respuesta).
- **Errores de negocio:** `throw new AppError(mensaje, status, code?, data?)` en `services`. El `error.middleware.js` los convierte en respuesta.
- **Errores async:** Express 5 envía al `errorHandler` cualquier error de un controlador `async`, así que los controladores no necesitan `try/catch`.
- **Cuerpo vacío:** en Express 5, `req.body` es `undefined` si no llega cuerpo. Los controladores pasan `req.body ?? {}`.
- **Validación:** `utils/validators.js` (`id`, `entero`, `precio`, `textoObligatorio`, `validarPassword`…). Un id que no es entero responde 400, nunca 500.
- **Seguridad:**
  - `authenticate` valida el JWT y **consulta el estado y el rol en la base en cada petición**: un usuario desactivado o con rol cambiado pierde el acceso de inmediato.
  - `authorize('admin')` valida el rol.
  - Ocultar un botón en React **no** es seguridad: el backend valida todo.
- **Datos sensibles:**
  - `errorHandler` nunca registra `req.body`, porque puede traer datos de pago.
  - De los pagos solo se guardan los últimos 4 dígitos.
  - Los tokens de recuperación se guardan como SHA-256.

### Acceso a datos con PostgreSQL

- **SQL:** siempre parametrizado (`db.query(sql, [valores])` con `$1, $2…`), nunca concatenando texto del usuario. Lo que no puede ser parámetro, como el `ORDER BY`, sale de una lista cerrada en el repositorio.
- **IDs:** se leen con `RETURNING` (no hay `insertId`). Las PK son `GENERATED ALWAYS AS IDENTITY`: nunca se envía un id al insertar.
- **Tipos:** `config/db.js` convierte NUMERIC (precios) e INT8 (`COUNT`) a `Number`. Las fechas `TIMESTAMPTZ` llegan como `Date` y se envían en ISO UTC.
- **Mayúsculas:** los correos y nombres únicos se comparan con `lower(col) = lower($1)`, que es lo que usan los índices únicos.
- **Transacciones:** con `withTransaction` de `repositories/transaction.js`. Cada función de repositorio recibe un último parámetro opcional `db` (el pool por defecto, o el cliente de la transacción):

  ```js
  await withTransaction(async (tx) => {
    const pedido = await pedidosRepository.crear(idUsuario, envio, tx);
    await pedidosRepository.insertarDetalle(pedido.id_pedido, items, tx);
  });
  ```

- **Bloqueos:** para descontar stock se usa `SELECT … FOR UPDATE ORDER BY id_producto`, que evita deadlocks, y luego `UPDATE … WHERE existencias >= n`.
- **Errores de PostgreSQL:** el servicio traduce los que tienen significado de negocio (ej. 23505 → "El correo ya está registrado"). Los demás los traduce el `errorHandler`: 23505 → 409, 23503 → 409, 23514 → 400, 22P02 → 400.
- **Esquema:** cada cambio es una migración nueva en `database/migrations/`. Ver [database/README](../../database/README.md).

## 4. Mapa de módulos del backend

| Módulo | Rutas | Servicio | Repositorios | CU |
|--------|-------|----------|--------------|----|
| Autenticación | `/api/auth` | `auth.services` | `usuarios`, `tokensRecuperacion` | 09, 10, 11, 22 |
| Usuarios (admin) | `/api/usuarios` | `usuarios.services` | `usuarios` | 19, 20, 21 |
| Catálogo y productos | `/api/categorias`, `/api/productos` | `productos.services`, `categorias.services` | `categorias`, `productos`, `producto_imagenes` (galería, decisión M) | 01, 02, 12–15 |
| Carrito | `/api/carrito` | `carrito.services` | `pedidos` (el carrito es un pedido en estado `carrito`, D12), `productos` | 03–07 |
| Pedidos y pagos | `/api/pedidos` | `pedidos.services` | `pedidos`, `pagos`, `productos` | 07, 08 |
| Tablero | `/api/dashboard` | `dashboard.services` | `dashboard` | 16, 17 (18 pendiente) |

## 5. Convenciones del frontend

| Carpeta | Responsabilidad |
|---------|-----------------|
| `pages/` | Una pantalla por ruta. Orquesta componentes y llama a servicios o contextos. |
| `components/` | Piezas visuales reutilizables. Reciben datos por props; no hacen `fetch`. |
| `context/` | Estado global (`AuthContext`, `CarritoContext`, `ToastContext`). `App.jsx` monta los proveedores en este orden: Router → `ToastProvider` → `AuthProvider`. |
| `hooks/` | Hooks propios (`useAuth`, …). |
| `services/` | Único lugar que llama a la API. `api.js` agrega el token Bearer, lanza `ApiError` (`message`, `status`, `code`, `data`) y avisa al `AuthContext` cuando una petición con token recibe 401 o 403 `CUENTA_DESACTIVADA`. |
| `utils/` | Funciones puras (`formatoCOP`, `urlImagen`, `localStorage`). |
| `assets/` | Sistema de diseño "Noche": `tokens.css` (única fuente de colores, tipografía, espacios, radios y sombras, con un bloque por tema: oscuro y claro), `base.css` (base global y componentes `.btn`, `.campo`, `.input`, `.tarjeta`, `.etiqueta`, `.alerta`…) y un `.css` por vista con clases BEM propias (`barra-cliente`, `barra-admin`, `toast`, `tienda`, `auth`, `panel`, `usuarios`, `dialogo`). |
| `test/` | Pruebas con Vitest y Testing Library. |

- Un componente **nunca** llama a `fetch` directamente: usa una función de `services/`.
- Las URLs del backend salen de `config/env.js` (`VITE_API_URL`); nunca se escriben a mano.
- Las respuestas se leen como `respuesta.data`. Los errores llegan como `ApiError` y se manejan por su `code` (ver contratos), nunca comparando textos.
- Las secciones privadas usan `components/ProtectedRoute.jsx` con roles: `/admin` solo `admin` y `/cuenta` solo `cliente`. Ocultar o proteger una pantalla no es seguridad: el backend valida el rol en cada petición.
- Dos estructuras de pantalla (rediseño): el cliente y el público usan la barra superior `BarraCliente` (`ClienteLayout`); el admin usa `AdminLayout` con la barra lateral `BarraAdmin` y solo ve su panel (`SinAdmin` lo redirige a `/admin` desde cualquier ruta del cliente).
- Ningún `.css` escribe colores a mano: todo sale de `var(--…)` en `tokens.css`.

## 6. Estado actual (deuda técnica conocida)

| Tema | Situación | Se resuelve en |
|------|-----------|----------------|
| El backend de los CU-01 a CU-22 está implementado; falta exportar (CU-18) | D11 decidida: `exceljs` + `pdfkit` en el backend, en memoria; por implementar | Sprint 4 ([B4.1](../guias-prompts/GUIA_PROMPTS_BACKEND.md#b41--exportación-excel-y-pdf)) |
| Las imágenes de los productos de la semilla no existen en disco | Decisión L: el frontend muestra una imagen de reemplazo | Sprint 2 ([F2.2](../guias-prompts/GUIA_PROMPTS_FRONTEND.md#f22--catálogo-desde-la-api)) |
| Versiones mayores nuevas de dependencias, sin vulnerabilidades: Vite 8, `@vitejs/plugin-react` 6, `@testing-library/jest-dom` 8 (frontend) y `dotenv` 18 (backend) | `npm audit` en 0; se actualizan cuando haga falta, cada una en su propio PR porque pueden traer cambios incompatibles | Sin sprint fijo |
| Sin ejecutor automático de migraciones ni envío real de correos | Manual con `psql`; token por consola | Sprint 5 (despliegue) |
| Pruebas automatizadas del backend incompletas | 209 pruebas: `auth` (B1.1), `usuarios` y control de acceso (B1.2), el carrito como pedido con su concurrencia (D12), catálogo, productos e imágenes (B2.1), categorías, eliminación de productos y galería (B2.2), y carrito, pedidos y pago con su concurrencia (B3.1, B3.2). Falta la cobertura completa del tablero; para él sigue valiendo la verificación manual | Sprint 4: [B4.2](../guias-prompts/GUIA_PROMPTS_BACKEND.md#b42--pruebas-del-tablero) |

**Resuelto en el Sprint 1:**
- Dos navbars y dos estilos aislados (`.lab` y `.tienda`): una sola navbar (F1.1) y el sistema de diseño "Montaña Clara" (F2.1). Se eliminaron `lab.css`, `LabLayout` y los estilos sin uso del CRUD de equipos.
- Claves de `localStorage` con prefijo `labcrud_`: ahora son `bikestore_token` y `bikestore_user` (F1.1).
- `ProtectedRoute` sin uso: ahora protege `/admin` y `/cuenta` por rol (F1.2).

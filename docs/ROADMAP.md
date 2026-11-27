# Roadmap · Bike Store

> **Para qué sirve:** saber qué toca en cada [sprint](GLOSARIO.md#sprint), quién lo hace y qué decisiones ya están tomadas.
> **Cuándo usarlo:** al empezar un sprint o una tarea, y cuando dudes por qué algo funciona como funciona.
> ← Volver al [índice de la documentación](README.md) · Términos desconocidos: [GLOSARIO](GLOSARIO.md)

## Estado general

- **Backend:** implementado para los CU-01 a CU-22 sobre [PostgreSQL](GLOSARIO.md#postgresql), salvo la exportación de CU-18, que ya tiene decisión ([D11](#resueltas)) y se implementa en el Sprint 4. Cada sprint de backend consiste en **asegurar con pruebas automatizadas** lo ya construido, corregir lo que esas pruebas revelen y terminar lo pendiente. Ya existe la base de pruebas (Vitest + Supertest, base `bike_store_test`) con 82 pruebas: `auth` (B1.1), `usuarios` y control de acceso (B1.2), y el carrito como pedido con su concurrencia (D12).
- **Frontend:**
  - **Ya hecho:** una sola navbar con la sesión, validación del token al abrir la app, cierre de sesión automático si la API la rechaza (F1.1); rutas `/admin` y `/cuenta` protegidas por rol (F1.2); recuperar y restablecer contraseña, y validaciones del registro (F1.3); panel de usuarios para el admin (F1.4); sistema de diseño "Montaña Clara" aplicado a todas las vistas (F2.1, adelantada).
  - **Sigue con [datos simulados](GLOSARIO.md#mock):** el catálogo y el carrito, hasta F2.2 y F3.1.
  - El resto de pantallas se construye en los sprints.
- **Base de datos:** el modelo está aprobado ([MODELO_DATOS](diseno-tecnico/MODELO_DATOS.md)) y las [migraciones](GLOSARIO.md#migracion) de la 002 a la 005 están verificadas. La 004 y la 005 aplican la decisión D12 (el carrito es un pedido en estado `carrito`).
- **Único punto abierto:** el [Sprint 5 · Despliegue](#sprint-5--despliegue-pendiente).

## Sprints

Cada tarea enlaza a su prompt. **Cada tarea es una [rama](GLOSARIO.md#rama) y un [PR](GLOSARIO.md#pr)**, siguiendo [CONTRIBUTING](../CONTRIBUTING.md).

| Sprint | RF · CU | Backend (Dev Backend) | Frontend (Dev Frontend) |
|--------|---------|-----------------------|-------------------------|
| **0 · Base** ✅ | – | Fusión, cambio a PostgreSQL, modelo, API completa | Fusión Lab + Carrito; login conectado a la API |
| **1 · Autenticación y seguridad** ✅ | RF-13–16, RF-27–31 · CU-09, 10, 11, 19, 20, 21, 22 | [B1.1](guias-prompts/GUIA_PROMPTS_BACKEND.md#b11--base-de-pruebas-automatizadas-y-autenticación) base de pruebas (Vitest + Supertest) y pruebas de `auth` ✅ · [B1.2](guias-prompts/GUIA_PROMPTS_BACKEND.md#b12--pruebas-de-usuarios-y-control-de-acceso) pruebas de `usuarios` y control de acceso ✅ | [F1.1](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f11--sesión-y-navbar-unificada) navbar con sesión y manejo de `CUENTA_DESACTIVADA` ✅ · [F1.2](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f12--rutas-protegidas-por-rol) rutas protegidas por rol ✅ · [F1.3](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f13--recuperar-contraseña-y-validar-registro) recuperar y restablecer contraseña, validación del registro ✅ · [F1.4](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f14--panel-de-usuarios-admin) panel de usuarios ✅ |
| **2 · Catálogo y productos** | RF-01–04, RF-17–20 · CU-01, 02, 12–15 | [B2.1](guias-prompts/GUIA_PROMPTS_BACKEND.md#b21--pruebas-de-catálogo-y-productos) pruebas de `productos` e imágenes | [F2.1](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f21--sistema-de-diseño-unificado) sistema de diseño ✅ (adelantada al Sprint 1) · [F2.2](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f22--catálogo-desde-la-api) catálogo desde la API con imagen de reemplazo (L) · [F2.3](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f23--panel-de-productos-admin) panel de productos |
| **3 · Carrito y checkout** | RF-05–12 · CU-03–08 | [B3.1](guias-prompts/GUIA_PROMPTS_BACKEND.md#b31--pruebas-del-carrito) pruebas de `carrito` · [B3.2](guias-prompts/GUIA_PROMPTS_BACKEND.md#b32--pruebas-de-pedidos-y-pago) pruebas de `pedidos` y pago | [F3.1](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f31--carrito-conectado-a-la-api) carrito conectado a la API (D4) · [F3.2](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f32--mis-pedidos-y-detalle-del-pedido) mis pedidos · [F3.3](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f33--checkout-y-pago-simulado) checkout y pago |
| **4 · Informes y tablero** | RF-21–26 · CU-16–18 | [B4.1](guias-prompts/GUIA_PROMPTS_BACKEND.md#b41--exportación-excel-y-pdf) exportación Excel y PDF (D11) · [B4.2](guias-prompts/GUIA_PROMPTS_BACKEND.md#b42--pruebas-del-tablero) pruebas del tablero | [F4.1](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f41--tablero-de-control-admin) tablero · [F4.2](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f42--exportar-informes) exportar informes |
| **5 · Despliegue** (pendiente) | RNF | Ver la [tabla siguiente](#sprint-5--despliegue-pendiente) | Build de producción; `VITE_API_URL` apuntando a la API publicada |

✅ = integrada en `develop`. Al cerrar cada sprint se integra `develop` en `main` como indica la [sección 8 de CONTRIBUTING](../CONTRIBUTING.md#8-cierre-de-sprint).

### Sprint 5 · Despliegue (pendiente)

Es el único sprint sin definir. Se planifica cuando termine el Sprint 4.

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
| D1 | El carrito exige sesión | `pedidos.id_usuario NOT NULL` (el carrito es un pedido, D12); `/carrito` con `authenticate` |
| D2 | La cantidad 0 se rechaza y se ofrece eliminar | `CANTIDAD_MINIMA` en `carrito.services` |
| D3 | El carrito se guarda en la base, por cliente | Pedido en estado `carrito` con sus líneas en `detalle_pedido`; índice único parcial `uq_pedidos_carrito_usuario` (uno por cliente). Antes: tablas `carritos` y `carrito_items`, eliminadas por D12 |
| D4 | Un producto inactivo queda en el carrito, marcado, y bloquea la compra | `motivo: INACTIVO`, `puede_comprar`, `CARRITO_NO_DISPONIBLE` |
| D5 / D6 | Un admin no puede cambiarse su propio rol ni desactivarse | `ACCION_SOBRE_SI_MISMO` en `usuarios.services` |
| D7 | Contraseña de mínimo 8 caracteres, con mayúscula, minúscula y número | `validators.validarPassword` (registro, restablecer y admin inicial) |
| D8 | Token de recuperación: 30 min, un solo uso, SHA-256; por consola y, en desarrollo, también en la respuesta | `auth.services`, `RESET_TOKEN_*` |
| D9 | Del pago solo se guardan los últimos 4 dígitos | `pagos.ultimos4` |
| D10 | El stock se descuenta al confirmar el pago, en una transacción | `pedidos.services.pagar` |
| D11 | Excel y PDF se generan **en el backend** con `exceljs` y `pdfkit`, en memoria, en `GET /api/dashboard/exportar?formato=xlsx\|pdf`; el frontend solo descarga. **Por implementar en el Sprint 4.** | Tareas [B4.1](guias-prompts/GUIA_PROMPTS_BACKEND.md#b41--exportación-excel-y-pdf) y [F4.2](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f42--exportar-informes); contrato en [API_CONTRATOS](diseno-tecnico/API_CONTRATOS.md#get-dashboardexportarformatoxlsxpdf--admin--cu-18--por-implementar) |
| D12 | **El carrito es un pedido en borrador.** Se eliminan `carritos` y `carrito_items`; el carrito es el pedido del cliente con `estado = 'carrito'` y sus líneas son filas de `detalle_pedido`. Al confirmar (`POST /pedidos`) pasa a `pendiente` en un solo `UPDATE`: el trigger asigna `fecha_pedido` y `numero_pedido`, y se refresca `precio_unitario` (R3). El carrito queda vacío al confirmar, no al pagar. El tablero filtra por `fecha_pedido` | Migraciones `004_estado_pedido_carrito.sql` y `005_carrito_como_pedido.sql`; `pedidos.repository`, `carrito.services`, `pedidos.services.confirmarCarrito`, `dashboard.repository`; contrato en [API_CONTRATOS](diseno-tecnico/API_CONTRATOS.md#carrito--cliente--sprint-3) |
| L | La semilla no trae imágenes reales; el frontend muestra una imagen de reemplazo cuando la imagen no existe | Tarea [F2.2](guias-prompts/GUIA_PROMPTS_FRONTEND.md#f22--catálogo-desde-la-api) (Sprint 2) |
| Diseño | Sistema de diseño "Montaña Clara" (opción C): azul `#1e40af`, amarillo `#fbbf24`, Outfit + Nunito Sans. Todo color sale de `frontend/src/assets/tokens.css` | Tarea F2.1, adelantada al Sprint 1 |
| Node | Versión mínima Node.js 22.12 (la exige Vitest 5); recomendada 26 LTS, en soporte hasta abril de 2029. Node 24 sigue con soporte y funciona, pero ya no es la recomendada. Node 20 terminó su soporte el 30-04-2026 | [GUIA_EJECUCION_LOCAL](GUIA_EJECUCION_LOCAL.md#1-verificar-los-requisitos) |
| A / B | Base regenerada sin ramas; módulo `equipos` retirado | Fase 0 (ver [historico/FUSION_FASE_0](historico/FUSION_FASE_0.md)) |
| D (pago) | Un número terminado en `0000` simula un rechazo | `pedidos.services` |
| E | El stock se valida, con los productos bloqueados, **antes** de simular el pago; si falta, 409 y no se registra ningún pago | `pedidos.services.pagar` |
| F | Un pedido `fallido` se puede volver a pagar | `pedidos.services.pagar` |
| G | Estado y rol se verifican en la base en cada petición | `auth.middleware.authenticate` |
| H | Migraciones aplicadas a mano con `psql` (ver [database/README](../database/README.md)) | `database/` |
| I | NUMERIC e INT8 se convierten a `Number` | `config/db.js` |
| J | Zona horaria America/Bogota en la base y en el pool | `ALTER DATABASE`, `DB_TIMEZONE` |
| K | Carrito y pago, solo para el rol `cliente` (aplicada por defecto; se cambia en una línea de cada ruta) | `carrito.routes`, `pedidos.routes` |

### Pendientes

| # | Pregunta | Sprint |
|---|----------|--------|
| — | Todo el [Sprint 5 (despliegue)](#sprint-5--despliegue-pendiente) | 5 |

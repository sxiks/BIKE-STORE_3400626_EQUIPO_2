# Guía de prompts · Dev Backend

> **Para qué sirve:** prompts listos para pedirle a una IA que trabaje las tareas del backend sin romper la [arquitectura en capas](../GLOSARIO.md#arquitectura-capas), y que al final te explique lo que hizo.
> **Cuándo usarla:** al empezar cada tarea del sprint ([sección 1](#sección-1--prompts-por-tarea-de-sprint)) o cuando te trabes con algo puntual ([sección 2](#sección-2--prompts-de-apoyo)).
> ← Volver al [índice de la documentación](../README.md) · Términos desconocidos: [GLOSARIO](../GLOSARIO.md)

> ⚠️ **Importante: sigue siempre el flujo de [CONTRIBUTING.md](../../CONTRIBUTING.md).** Cada tarea va en su propia [rama](../GLOSARIO.md#rama) creada desde `develop` actualizado, solo toca `backend/` y `database/` (más `docs/diseno-tecnico/API_CONTRATOS.md` cuando cambia un contrato) y entra por [Pull Request](../GLOSARIO.md#pr) con la aprobación del Dev Frontend. Si cambia un endpoint, primero va el contrato (ver la [sección 3 de CONTRIBUTING](../../CONTRIBUTING.md#3-contrato-primero)).

## Cómo usar esta guía

1. **Crea la rama de la tarea**, como indica el [ciclo diario de CONTRIBUTING](../../CONTRIBUTING.md#4-ciclo-diario-de-una-tarea):
   ```bash
   git switch develop && git pull
   git switch -c feature/back-<nombre>
   ```
2. **Abre un chat nuevo** con la IA y pega el [Prompt 0](#prompt-0--contexto-pegar-siempre-primero). Adjunta los archivos que menciona.
3. **Pega el prompt de tu tarea** ([sección 1](#sección-1--prompts-por-tarea-de-sprint)) y completa lo que esté entre `[corchetes]`.
4. **Aprueba el plan** antes de que escriba código. Al terminar, la IA te explica la implementación y te da los pasos para subirla y abrir el PR.
5. Si surge un problema puntual (un error 500, una consulta SQL, un conflicto), usa el prompt de apoyo correspondiente de la [sección 2](#sección-2--prompts-de-apoyo) en el mismo chat.

**Contexto del backend en los sprints:** la API de los CU-01 a CU-22 ya está implementada y verificada a mano. El trabajo del backend en cada sprint es **asegurarla con pruebas automatizadas** del módulo que el frontend está conectando en ese sprint, **corregir lo que esas pruebas revelen** e implementar lo pendiente: la exportación del Sprint 4 (decisión D11).

---

## Prompt 0 · Contexto (pegar siempre primero)

```
Soy el Dev Backend de Bike Store (SENA). Backend: Node.js 24 LTS, Express 5, PostgreSQL 15+ con driver pg, JWT + bcrypt, multer. Arquitectura en capas:
routes -> middlewares -> controllers -> services -> repositories -> PostgreSQL.
Reglas que debes respetar:
- Solo repositories/ importa config/db. Cada función de repositorio recibe como último parámetro opcional `db` (pool por defecto o el cliente de una transacción).
- SQL siempre parametrizado con $1, $2...; ids con RETURNING; ORDER BY solo desde una lista cerrada. Comparaciones de correo y nombres únicos con lower(col) = lower($1).
- Transacciones con withTransaction de repositories/transaction.js, llamadas desde services.
- services: reglas y validaciones con utils/validators.js; errores con AppError(message, status, code?, data?). Sin req/res ni SQL.
- controllers: async, sin try/catch (Express 5 propaga los errores), pasan req.body ?? {} y responden con utils/respuesta.ok().
- Respuestas: { ok: true, data, message? } / { ok: false, message, code?, data? }.
- middlewares: authenticate (JWT + estado/rol en BD en cada petición), authorize(...roles), uploadProductoImagen, errorHandler (nunca registra req.body).
- pg devuelve NUMERIC e INT8 como Number (config/db.js); TIMESTAMPTZ como Date; zona horaria America/Bogota.
- Cambios de esquema = migración nueva database/migrations/00N_*.sql (nunca editar una ya integrada).
- Solo trabajo en backend/, database/ y docs/diseno-tecnico/API_CONTRATOS.md. El frontend es de mi compañero.
- El flujo de trabajo es el de CONTRIBUTING.md: una rama por tarea desde develop, contrato antes que código, commits con Conventional Commits, PR hacia develop con la plantilla .github/pull_request_template.md y 1 aprobación.
Adjunto: docs/diseno-tecnico/ARQUITECTURA.md, docs/diseno-tecnico/API_CONTRATOS.md, docs/diseno-tecnico/MODELO_DATOS.md, CONTRIBUTING.md y los archivos que voy a tocar.
Entrega por pasos: primero el análisis y la lista de archivos a crear o modificar; espera mi aprobación antes de escribir código.
```

---

## Sección 1 · Prompts por tarea de sprint

Un prompt por tarea. **Cada tarea es una rama y un PR.** Hazlas en el orden de la tabla. ✅ = integrada en `develop`. El estado de cada sprint está en el [ROADMAP](../ROADMAP.md#sprints).

| Sprint | Tarea | Rama | CU | Depende de |
|---|---|---|---|---|
| 1 ✅ | [B1.1 Base de pruebas automatizadas y autenticación](#b11--base-de-pruebas-automatizadas-y-autenticación) | `feature/back-tests-auth` | 09, 10, 11 | — |
| 1 | [B1.2 Pruebas de usuarios y control de acceso](#b12--pruebas-de-usuarios-y-control-de-acceso) | `feature/back-tests-usuarios` | 19–22 | B1.1 |
| 2 | [B2.1 Pruebas de catálogo y productos](#b21--pruebas-de-catálogo-y-productos) | `feature/back-tests-productos` | 01, 02, 12–15 | B1.1 |
| 3 | [B3.1 Pruebas del carrito](#b31--pruebas-del-carrito) | `feature/back-tests-carrito` | 03–07 | B1.1 |
| 3 | [B3.2 Pruebas de pedidos y pago](#b32--pruebas-de-pedidos-y-pago) | `feature/back-tests-pedidos-pagos` | 07, 08 | B3.1 |
| 4 | [B4.1 Exportación Excel y PDF](#b41--exportación-excel-y-pdf) | `docs/contrato-exportacion` + `feature/back-exportacion-dashboard` | 18 | B1.1 |
| 4 | [B4.2 Pruebas del tablero](#b42--pruebas-del-tablero) | `feature/back-tests-dashboard` | 16, 17 | B1.1 |

Todos los prompts de esta sección terminan con el mismo **bloque de cierre**: explicación de cómo, por qué y para qué se hizo, cómo probarlo y pasos para el PR. Está incluido en cada uno para que se copien completos.

### B1.1 · Base de pruebas automatizadas y autenticación

> ✅ **Hecha.** Resultado: Vitest + Supertest, base `bike_store_test` con protección por nombre, `npm run test:db` y `tests/auth.test.js` (32 pruebas). Las tareas B siguientes agregan su archivo en `tests/` y reutilizan `tests/helpers/`. Este prompt queda como referencia.

```
TAREA B1.1 · Sprint 1 · CU-09, CU-10, CU-11 · Rama: feature/back-tests-auth (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: montar la infraestructura de pruebas automatizadas del backend y cubrir el módulo de autenticación.

ESPECIFICACIONES:
- Herramientas: Vitest + Supertest como dependencias de desarrollo (commit aparte, como pide CONTRIBUTING.md). Las pruebas importan src/app.js, que ya está separado de server.js, sin levantar el puerto.
- Base de datos de pruebas separada: bike_store_test, con un archivo .env.test (agregar un .env.test.example con valores de ejemplo; el .env.test real no se sube).
- Un script que (re)cree la base de pruebas y le aplique las migraciones 002 y 003 antes de correr las pruebas (por ejemplo `npm run test:db`), y limpieza de datos entre pruebas para que sean independientes.
- Scripts en package.json: "test" y "test:watch".
- Casos de autenticación (contratos en API_CONTRATOS.md, adjunto):
  · registro: 201; correo duplicado sin distinguir mayúsculas → 409; contraseña que no cumple D7 → 400; correo inválido → 400; sin cuerpo → 400 (no 500).
  · login: 200 con data.token y sin password; credenciales malas → 401; cuenta desactivada → 403 CUENTA_DESACTIVADA.
  · recuperar: misma respuesta exista o no el correo; token_desarrollo solo con NODE_ENV=development y RESET_TOKEN_EN_RESPUESTA=true.
  · restablecer: valida D7; un solo uso; pedir un token nuevo invalida el anterior → TOKEN_INVALIDO.
- No cambiar el comportamiento de la API. Si una prueba revela un error real, detente, explícamelo y propón la corrección mínima antes de aplicarla.
- Documentar cómo correr las pruebas en backend/README.md.

ARCHIVOS PROBABLES: backend/package.json, backend/vitest.config.js, backend/.env.test.example, backend/scripts/ (preparar la base de pruebas), backend/tests/auth.test.js, backend/tests/helpers/, backend/README.md, .gitignore (si hace falta ignorar .env.test).

CRITERIOS DE ACEPTACIÓN: `npm run test:db && npm test` pasa desde cero en Linux y en Windows; las pruebas no tocan la base de desarrollo bike_store.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos exactos y resultado esperado.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits; dependencias nuevas en un commit aparte), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Si hay migración nueva o variables nuevas en .env.example, indícalo en el PR y di qué debe ejecutar el Dev Frontend en su PC. Indica qué hace el Dev Frontend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### B1.2 · Pruebas de usuarios y control de acceso

```
TAREA B1.2 · Sprint 1 · CU-19, CU-20, CU-21, CU-22 · Rama: feature/back-tests-usuarios (ya creada desde develop actualizado; si no, dame primero los comandos).
REQUISITO PREVIO: B1.1 integrada (infraestructura de pruebas).

OBJETIVO: cubrir con pruebas la administración de usuarios y el control de acceso por rol.

ESPECIFICACIONES (contratos en la sección "Usuarios · admin" de API_CONTRATOS.md, adjunto):
- GET /usuarios: solo admin (cliente → 403, sin token → 401); búsqueda por q (nombre o correo, sin distinguir mayúsculas) y filtros rol y estado.
- PATCH /usuarios/:id/rol y /estado: funcionan sobre otro usuario; sobre sí mismo → 400 ACCION_SOBRE_SI_MISMO (D5 y D6); id no numérico → 400; inexistente → 404; valor inválido → 400.
- authenticate revalida en cada petición: un token vigente de una cuenta recién desactivada → 403 CUENTA_DESACTIVADA; un cambio de rol aplica sin volver a iniciar sesión.
- GET /auth/me devuelve el usuario sin password.
- No cambiar el comportamiento de la API. Si una prueba revela un error real, detente, explícamelo y propón la corrección mínima.

ARCHIVOS PROBABLES: backend/tests/usuarios.test.js, backend/tests/helpers/.

CRITERIOS DE ACEPTACIÓN: todas las pruebas, nuevas y de B1.1, pasan con `npm test`.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos exactos y resultado esperado.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Si hay migración nueva o variables nuevas en .env.example, indícalo en el PR y di qué debe ejecutar el Dev Frontend en su PC. Indica qué hace el Dev Frontend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### B2.1 · Pruebas de catálogo y productos

```
TAREA B2.1 · Sprint 2 · CU-01, CU-02, CU-12 a CU-15 · Rama: feature/back-tests-productos (ya creada desde develop actualizado; si no, dame primero los comandos).
REQUISITO PREVIO: B1.1 integrada.

OBJETIVO: cubrir con pruebas el catálogo público y la administración de productos, incluida la subida de imágenes.

ESPECIFICACIONES (contratos en la sección "Catálogo y productos" de API_CONTRATOS.md, adjunto):
- Público: GET /productos solo devuelve activos (incluye agotados con disponible = false); filtro por categoría; orden precio_asc y precio_desc; orden inválido → 400; GET /productos/:id de un inactivo → 404; GET /categorias.
- Admin: GET /productos/admin incluye inactivos y filtra por q, categoría y estado; cliente → 403.
- Crear (multipart, con una imagen PNG de prueba como fixture): 201; sin imagen → 400; precio ≤ 0 o existencias negativas → 400; categoría inexistente → 400; nombre duplicado en la misma categoría sin distinguir mayúsculas → 409 PRODUCTO_DUPLICADO.
- Imagen: formato no permitido → 400; mayor a 2 MB → 400 (no 500).
- Editar: actualización parcial (lo no enviado se conserva); al reemplazar la imagen se borra la anterior del disco.
- PATCH /productos/:id/estado: inactivar y reactivar.
- Las pruebas deben limpiar los archivos que suban a backend/uploads/productos.
- No cambiar el comportamiento de la API. Si una prueba revela un error real, detente, explícamelo y propón la corrección mínima.

ARCHIVOS PROBABLES: backend/tests/productos.test.js, backend/tests/fixtures/, backend/tests/helpers/.

CRITERIOS DE ACEPTACIÓN: todas las pruebas pasan con `npm test` y no quedan archivos huérfanos en uploads/.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos exactos y resultado esperado.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Si hay migración nueva o variables nuevas en .env.example, indícalo en el PR y di qué debe ejecutar el Dev Frontend en su PC. Indica qué hace el Dev Frontend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### B3.1 · Pruebas del carrito

```
TAREA B3.1 · Sprint 3 · CU-03 a CU-07 · Rama: feature/back-tests-carrito (ya creada desde develop actualizado; si no, dame primero los comandos).
REQUISITO PREVIO: B1.1 integrada.

OBJETIVO: cubrir con pruebas el carrito persistido por cliente. El carrito es el pedido del cliente en estado 'carrito' y sus líneas son filas de detalle_pedido (decisión D12); tests/carrito-pedido.test.js ya cubre el modelo: amplíalo sin duplicar casos.

ESPECIFICACIONES (contratos en la sección "Carrito · cliente" de API_CONTRATOS.md, adjunto):
- Acceso: sin token → 401 (D1); con rol admin → 403 (K).
- Agregar: suma cantidades sobre la misma línea (R2); superar las existencias → 400 STOCK_MAXIMO con data.maximo; producto agotado → 400 SIN_STOCK; producto inactivo → 400 PRODUCTO_INACTIVO; inexistente → 404.
- Actualizar: cantidad 0 → 400 CANTIDAD_MINIMA; decimal o negativa → 400; producto que no está en el carrito → 404.
- Eliminar: siempre permitido, incluso si el producto está inactivo (D4).
- GET /carrito: totales correctos; un producto inactivado después de agregarlo aparece con disponible = false, motivo INACTIVO, y puede_comprar = false (D4, CU-06, CU-07); el carrito se conserva entre sesiones; un cliente nunca tiene dos pedidos en estado 'carrito'.
- No cambiar el comportamiento de la API. Si una prueba revela un error real, detente, explícamelo y propón la corrección mínima.

ARCHIVOS PROBABLES: backend/tests/carrito.test.js, backend/tests/helpers/.

CRITERIOS DE ACEPTACIÓN: todas las pruebas pasan con `npm test`.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos exactos y resultado esperado.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Si hay migración nueva o variables nuevas en .env.example, indícalo en el PR y di qué debe ejecutar el Dev Frontend en su PC. Indica qué hace el Dev Frontend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### B3.2 · Pruebas de pedidos y pago

```
TAREA B3.2 · Sprint 3 · CU-07, CU-08 · Rama: feature/back-tests-pedidos-pagos (ya creada desde develop actualizado; si no, dame primero los comandos).
REQUISITO PREVIO: B3.1 integrada.

OBJETIVO: cubrir con pruebas la creación de pedidos y el flujo transaccional del pago simulado.

ESPECIFICACIONES (contratos en la sección "Pedidos y pago · cliente" de API_CONTRATOS.md; flujo en las decisiones 10, E y F de docs/diseno-tecnico/MODELO_DATOS.md y docs/ROADMAP.md, adjuntos):
- Confirmar el carrito (POST /pedidos): carrito vacío → 400 CARRITO_VACIO; con ítems no disponibles → 409 CARRITO_NO_DISPONIBLE y el pedido sigue en estado 'carrito'; datos de envío incompletos → 400; éxito → 201, el mismo id_pedido pasa a 'pendiente' con numero_pedido BS-AAAA-NNNNNN y fecha_pedido (trigger), precio_unitario refrescado al vigente (R3: cambiar el precio después no altera el pedido) y el carrito queda vacío.
- Pago: número inválido → 400; número terminado en 0000 → 402 PAGO_RECHAZADO, pedido fallido y SIN descontar stock; reintento sobre el pedido fallido → 201 aprobado (F); al aprobar se descuenta el stock, se registra el pago con solo los últimos 4 dígitos (el carrito ya se vació al confirmar); segundo pago → 409 PEDIDO_YA_PAGADO; pagar un pedido en estado 'carrito' → 404.
- Decisión E: si el stock bajó entre crear el pedido y pagarlo → 409 SIN_STOCK, el pedido sigue pendiente y NO se registra ningún pago.
- Acceso: el pedido de otro cliente → 404; el admin puede ver cualquier pedido con GET /pedidos/:numero pero no pagar (403).
- Opcional: una prueba de concurrencia con dos pagos simultáneos sobre la última unidad (solo uno debe aprobarse).
- No cambiar el comportamiento de la API. Si una prueba revela un error real, detente, explícamelo y propón la corrección mínima.

ARCHIVOS PROBABLES: backend/tests/pedidos.test.js, backend/tests/helpers/.

CRITERIOS DE ACEPTACIÓN: todas las pruebas pasan con `npm test`.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos exactos y resultado esperado.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Si hay migración nueva o variables nuevas en .env.example, indícalo en el PR y di qué debe ejecutar el Dev Frontend en su PC. Indica qué hace el Dev Frontend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### B4.1 · Exportación Excel y PDF

```
TAREA B4.1 · Sprint 4 · CU-18 · Decisión D11 · Ramas: docs/contrato-exportacion (contrato) y luego feature/back-exportacion-dashboard (implementación), ambas desde develop actualizado; si no existen, dame primero los comandos.
REQUISITO PREVIO: B1.1 integrada.

OBJETIVO: implementar la exportación del tablero a Excel y PDF, generada en el backend, como define D11.

PASO 1 · CONTRATO (rama docs/contrato-exportacion, PR propio, aprobado por el Dev Frontend antes de programar):
- Completar en docs/diseno-tecnico/API_CONTRATOS.md la entrada "GET /dashboard/exportar" (hoy marcada como "por implementar"): query formato=xlsx|pdf, desde, hasta y categoria (mismas reglas que /dashboard/metricas); solo admin; respuesta 200 con el archivo (Content-Type y Content-Disposition con un nombre como bike-store-informe-AAAA-MM-DD.xlsx); errores en JSON: 400 formato o fechas inválidos, 401, 403.

PASO 2 · IMPLEMENTACIÓN (rama feature/back-exportacion-dashboard):
- Dependencias exceljs y pdfkit (commit aparte).
- Ruta en routes/dashboard.routes.js → controlador → servicio que REUTILIZA dashboard.services.metricas (y alertas, si se incluyen) → generadores en memoria (Buffer o stream), sin guardar archivos en disco.
- Contenido del informe: filtros aplicados, ventas totales, cantidad de pedidos, unidades vendidas y la tabla de más vendidos (montos en COP).
- Respetar la regla de dependencia: la generación del archivo va en el servicio o en un módulo de utilidades, nunca en el controlador ni en el repositorio.
- Pruebas: 200 con el Content-Type correcto para cada formato, archivo no vacío, 400 con formato inválido, 403 para cliente.

ARCHIVOS PROBABLES: docs/diseno-tecnico/API_CONTRATOS.md, backend/package.json, backend/src/routes/dashboard.routes.js, backend/src/controllers/dashboard.controller.js, backend/src/services/dashboard.services.js, backend/src/utils/ (generadores), backend/tests/dashboard-export.test.js.

CRITERIOS DE ACEPTACIÓN: los dos archivos se descargan y se abren correctamente; las pruebas pasan; el contrato coincide con la implementación.

AL TERMINAR CADA PASO entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos exactos (incluido un curl o Invoke-RestMethod que descargue el archivo) y resultado esperado.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits; dependencias en commit aparte), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Avisa en el PR al Dev Frontend que ya puede hacer su tarea F4.2. Indica qué hace el Dev Frontend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### B4.2 · Pruebas del tablero

```
TAREA B4.2 · Sprint 4 · CU-16, CU-17 · Rama: feature/back-tests-dashboard (ya creada desde develop actualizado; si no, dame primero los comandos).
REQUISITO PREVIO: B1.1 integrada.

OBJETIVO: cubrir con pruebas las métricas y alertas del tablero.

ESPECIFICACIONES (contratos en la sección "Tablero · admin" de API_CONTRATOS.md, adjunto):
- Métricas: solo cuentan pedidos pagados y filtran por fecha_pedido (no por created_at); los carritos nunca cuentan; filtro desde/hasta inclusivo interpretado en hora de Colombia (un pedido de las 23:30 hora local pertenece a ese día); filtro por categoría; top 5 de más vendidos ordenado; fecha inválida o desde > hasta → 400; cliente → 403.
- Alertas: stock bajo según STOCK_BAJO_UMBRAL, agotados, inactivos dentro de carritos (líneas de pedidos en estado 'carrito'), pedidos pendientes y fallidos con fecha_pedido (sin carritos).
- No cambiar el comportamiento de la API. Si una prueba revela un error real, detente, explícamelo y propón la corrección mínima.

ARCHIVOS PROBABLES: backend/tests/dashboard.test.js, backend/tests/helpers/.

CRITERIOS DE ACEPTACIÓN: todas las pruebas pasan con `npm test`.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos exactos y resultado esperado.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Si hay migración nueva o variables nuevas en .env.example, indícalo en el PR y di qué debe ejecutar el Dev Frontend en su PC. Indica qué hace el Dev Frontend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

---

## Sección 2 · Prompts de apoyo

Problemas puntuales que aparecen en **cualquier** tarea. No son tareas del sprint: resuelven un paso concreto dentro de ellas. Úsalos en el mismo chat de la tarea, después del Prompt 0.

| Prompt | Úsalo cuando… |
|---|---|
| [A1 Endpoint nuevo](#a1--endpoint-nuevo-contrato-primero) | aparece un requisito que necesita una ruta que no existe |
| [A2 Consulta SQL](#a2--consulta-sql-o-función-de-repositorio) | necesitas una consulta nueva en un repositorio |
| [A3 Regla de negocio](#a3--regla-de-negocio-en-un-servicio) | hay que agregar o ajustar una validación |
| [A4 Transacción y concurrencia](#a4--transacción-y-concurrencia) | una operación toca varias tablas a la vez |
| [A5 Migración nueva](#a5--migración-nueva) | hay que cambiar el esquema de la base |
| [A6 Error 500](#a6--error-500-o-comportamiento-inesperado) | la API falla o responde algo inesperado |
| [A7 Seguridad de un endpoint](#a7--seguridad-de-un-endpoint) | quieres auditar un módulo |
| [A8 Conflicto de merge](#a8--conflicto-de-merge) | `git merge origin/develop` marca conflictos |
| [A9 Revisión antes del PR](#a9--revisión-antes-de-abrir-el-pr) | vas a abrir el PR y quieres una revisión previa |

### A1 · Endpoint nuevo (contrato primero)

**Para qué sirve:** diseñar un [endpoint](../GLOSARIO.md#endpoint) nuevo empezando por su [contrato](../GLOSARIO.md#contrato-api) e implementarlo en todas las capas.
**Cuándo usarlo:** cuando un requisito necesita una ruta que no existe en [API_CONTRATOS](../diseno-tecnico/API_CONTRATOS.md).

```
Necesito el endpoint [MÉTODO /ruta] para [CU-XX / RF-XX]. Rol: [pública | cliente | admin].
Qué hace: [descripción]. Reglas de negocio: [lista].
Paso 1: redacta el bloque para docs/diseno-tecnico/API_CONTRATOS.md con la plantilla del final del documento (request, respuestas, codes). Ese cambio va en su propia rama docs/contrato-[tema] con PR.
Paso 2 (tras la aprobación del contrato): implementa route -> controller -> service -> repository siguiendo como ejemplo el módulo más parecido [adjúntalo].
Indica qué archivos cambian, cómo probarlo con curl y explica al final cómo encaja cada capa.
```

### A2 · Consulta SQL o función de repositorio

**Para qué sirve:** escribir una consulta [parametrizada](../GLOSARIO.md#sql-parametrizado) en la capa de [repositorios](../GLOSARIO.md#repositorio-capa) y entender qué [índice](../GLOSARIO.md#indice) usa.
**Cuándo usarlo:** cuando un servicio necesita un dato que ningún repositorio entrega todavía.

```
Necesito una función de repositorio en repositories/[modulo].repository.js que [descripción del dato que necesito].
Tablas involucradas: [tablas] (modelo en docs/diseno-tecnico/MODELO_DATOS.md y database/migrations/002_modelo_bike_store.sql, adjuntos).
Requisitos: parámetros $n, filtros opcionales armados con un arreglo de condiciones (como usuarios.repository.buscar), parámetro opcional `db`, y qué índice existente usa (o si conviene uno nuevo vía migración).
Explica la consulta línea por línea en 3-5 frases.
```

### A3 · Regla de negocio en un servicio

**Para qué sirve:** ubicar correctamente una validación nueva en la capa de [servicios](../GLOSARIO.md#servicio) y definir su error.
**Cuándo usarlo:** cuando aparece una regla nueva o hay que ajustar una existente.

```
En services/[modulo].services.js necesito aplicar la regla: [regla, ej. "un cliente no puede tener más de 3 pedidos pendientes"].
Archivos actuales: [adjunta el servicio y su repositorio].
Indica: dónde va la validación, qué AppError (status y code) lanza, si necesita una transacción o un bloqueo (FOR UPDATE), y qué fila de la tabla de codes de API_CONTRATOS.md hay que agregar.
```

### A4 · Transacción y concurrencia

**Para qué sirve:** diseñar una operación de varias tablas que se aplique completa o no se aplique ([transacción](../GLOSARIO.md#transaccion)) y sin [deadlocks](../GLOSARIO.md#deadlock).
**Cuándo usarlo:** cuando una operación escribe en varias tablas o compite por las mismas filas.

```
Esta operación toca varias tablas: [describe los pasos].
Diseña el flujo con withTransaction: qué filas bloquear (FOR UPDATE) y en qué orden para evitar deadlocks, qué validar antes de escribir, y qué pasa si falla cada paso (ROLLBACK, qué responde la API).
Toma como referencia pedidos.services.pagar (adjunto).
```

### A5 · Migración nueva

**Para qué sirve:** cambiar el esquema con una [migración](../GLOSARIO.md#migracion) nueva sin editar las existentes.
**Cuándo usarlo:** al agregar o modificar tablas, columnas, índices o restricciones (ver [database/README](../../database/README.md#cómo-agregar-una-migración-nueva-dev-backend)).

```
Necesito cambiar el esquema: [ej. agregar columna `marca` a productos / nueva tabla X].
Esquema actual: database/migrations/002_modelo_bike_store.sql (adjunto).
Genera database/migrations/00[N]_[descripcion].sql para PostgreSQL 15+: envuelto en BEGIN/COMMIT, con constraints con nombre (ck_/fk_/uq_/ix_), valores por defecto seguros para filas existentes, y comentarios con el CU.
Lista los repositorios, servicios y contratos que cambian, y el texto "Requiere aplicar la migración 00N" para el PR con los comandos que debe ejecutar cada PC.
```

### A6 · Error 500 o comportamiento inesperado

**Para qué sirve:** encontrar la causa de un fallo y la corrección mínima.
**Cuándo usarlo:** cuando la API responde 500 o algo distinto a lo que dice el contrato.

```
Al llamar [MÉTODO /ruta] con [body] obtengo [status y respuesta]. En la consola del backend aparece:
[pega el error y el stack]
Archivos involucrados: [adjunta route, controller, service y repository].
Encuentra la causa, explica por qué ocurre y propón la corrección mínima. Si el error es de PostgreSQL, di su código SQLSTATE y si el servicio debería traducirlo a un AppError con code.
```

### A7 · Seguridad de un endpoint

**Para qué sirve:** auditar autenticación, autorización, validaciones y fugas de datos sensibles.
**Cuándo usarlo:** antes de cerrar un sprint, o cuando se toca un módulo que maneja datos personales o pagos.

```
Revisa la seguridad de [ruta / módulo] (archivos adjuntos):
autenticación y rol correctos, que un usuario no pueda leer ni modificar datos de otro (comparar id_usuario), validación de cada entrada, SQL parametrizado, que no se filtren datos sensibles (password, tokens, números de pago) en respuestas ni logs, y límites (tamaño de archivos, paginación).
Devuélveme los hallazgos ordenados por gravedad con la corrección mínima de cada uno.
```

### A8 · Conflicto de merge

**Para qué sirve:** resolver un [conflicto](../GLOSARIO.md#conflicto) sin perder cambios de nadie.
**Cuándo usarlo:** cuando `git merge origin/develop` en tu rama marca archivos en conflicto (ver la [sección 5 de CONTRIBUTING](../../CONTRIBUTING.md#5-pull-requests)).

```
Al hacer git merge origin/develop en mi rama feature/back-[modulo] tengo conflicto en [archivo].
Pego el bloque con las marcas <<<<<<< ======= >>>>>>>:
[bloque]
Explícame qué trae cada lado y propón la versión final que conserve ambos cambios. Si el conflicto es en package-lock.json, dame los comandos para regenerarlo. Sin --force.
```

### A9 · Revisión antes de abrir el PR

**Para qué sirve:** una revisión previa del diff para que el PR llegue limpio a la aprobación.
**Cuándo usarlo:** justo antes de abrir el PR.

```
Revisa este diff antes de abrir el PR hacia develop:
[pega git diff origin/develop...HEAD -- backend/ database/ docs/diseno-tecnico/API_CONTRATOS.md]
Verifica: regla de capas (los 3 grep de la sección 2 de docs/diseno-tecnico/ARQUITECTURA.md), SQL parametrizado, errores con AppError y code, contrato actualizado, migración nueva en lugar de editar una existente, variables nuevas en .env.example, sin console.log de depuración ni datos sensibles en logs.
Devuélveme una lista corta de problemas y un título + descripción para el PR según .github/pull_request_template.md.
```

---

**Ver también:** [GUIA_PROMPTS_FRONTEND](GUIA_PROMPTS_FRONTEND.md) · [API_CONTRATOS](../diseno-tecnico/API_CONTRATOS.md) · [ARQUITECTURA](../diseno-tecnico/ARQUITECTURA.md) · [MODELO_DATOS](../diseno-tecnico/MODELO_DATOS.md) · [ROADMAP](../ROADMAP.md) · [CONTRIBUTING](../../CONTRIBUTING.md)

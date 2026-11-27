# Guía de prompts · Dev Frontend

> **Para qué sirve:** prompts listos para pedirle a una IA que implemente las tareas del frontend sin romper la arquitectura, y que al final te explique lo que hizo.
> **Cuándo usarla:** al empezar cada tarea del sprint ([sección 1](#sección-1--prompts-por-tarea-de-sprint)) o cuando te trabes con algo puntual ([sección 2](#sección-2--prompts-de-apoyo)).
> ← Volver al [índice de la documentación](../README.md) · Términos desconocidos: [GLOSARIO](../GLOSARIO.md)

> ⚠️ **Importante: sigue siempre el flujo de [CONTRIBUTING.md](../../CONTRIBUTING.md).** Cada tarea va en su propia [rama](../GLOSARIO.md#rama) creada desde `develop` actualizado, solo toca `frontend/` y entra por [Pull Request](../GLOSARIO.md#pr) con la aprobación del Dev Backend. Saltarse estos pasos causa [conflictos de merge](../GLOSARIO.md#conflicto) y PRs bloqueados por la [protección de ramas](../GLOSARIO.md#proteccion-rama).

## Cómo usar esta guía

1. **Crea la rama de la tarea**, como indica el [ciclo diario de CONTRIBUTING](../../CONTRIBUTING.md#4-ciclo-diario-de-una-tarea):
   ```bash
   git switch develop && git pull
   git switch -c feature/front-<nombre>
   ```
2. **Abre un chat nuevo** con la IA y pega el [Prompt 0](#prompt-0--contexto-pegar-siempre-primero). Adjunta los archivos que menciona.
3. **Pega el prompt de tu tarea** ([sección 1](#sección-1--prompts-por-tarea-de-sprint)) y completa lo que esté entre `[corchetes]`.
4. **Aprueba el plan** antes de que escriba código. Al terminar, la IA te explica la implementación y te da los pasos para subirla y abrir el PR.
5. Si durante la tarea surge un problema puntual (un error con la API, un conflicto, unas pruebas), usa el prompt de apoyo correspondiente de la [sección 2](#sección-2--prompts-de-apoyo) en el mismo chat.

---

## Prompt 0 · Contexto (pegar siempre primero)

```
Soy el Dev Frontend de Bike Store (SENA). Monorepo: backend Express 5 + PostgreSQL ya implementado; frontend React 19 + Vite 7 + React Router 7 + Vitest, CSS puro, íconos lucide-react, arrastrar y soltar con dnd-kit. Node.js 26 LTS.
Reglas del frontend que debes respetar:
- pages/ orquesta; components/ solo recibe props y no hace fetch; services/ es el único que llama a la API usando api.js (agrega el Bearer token); context/ para estado global (AuthContext, CarritoContext, ToastContext); utils/ funciones puras (formatoCOP, urlImagen); data/ mocks.
- Respuestas de la API: éxito { ok: true, data, message? }; error { ok: false, message, code?, data? }. Reacciono a errores por `code` (tabla de códigos en API_CONTRATOS.md), nunca comparando textos.
- Dinero en COP como número; fechas en ISO UTC.
- URL base desde config/env.js (VITE_API_URL). Nada de URLs a mano.
- Mensajes al usuario con ToastContext (mostrar), nunca alert() ni confirm().
- Sistema de diseño "Noche" con tema oscuro y claro: colores, tipografía (Inter), espacios, radios y sombras SOLO con las variables de assets/tokens.css (nunca un color a mano; texto sobre un fondo de color con su --color-sobre-…). Todo debe verse bien en los dos temas. Reutiliza las clases de assets/base.css (.contenedor, .btn + .btn--primario/--suave/--acento/--peligro, .icono-btn, .campo, .input, .tarjeta, .etiqueta--exito/--aviso/--error, .alerta--error, .solo-lector) y crea clases BEM propias por componente en su .css.
- Estructura (rediseño): el cliente y las páginas públicas usan components/BarraCliente.jsx (ClienteLayout); el admin usa components/AdminLayout.jsx con la barra lateral BarraAdmin.jsx y solo ve su panel (SinAdmin lo lleva a /admin). Una página nueva de admin va dentro del grupo ProtectedRoute(admin) → AdminLayout en App.jsx, y su sección de BarraAdmin pasa de "Sprint N" a enlace (campo `ruta`).
- Solo trabajo dentro de frontend/. No propongas cambios en backend/ ni database/: si algo falta en la API, ayúdame a redactar el pedido para el Dev Backend.
- El flujo de trabajo es el de CONTRIBUTING.md: una rama por tarea desde develop, commits con Conventional Commits, PR hacia develop con la plantilla .github/pull_request_template.md y 1 aprobación.
Adjunto: docs/diseno-tecnico/ARQUITECTURA.md, docs/diseno-tecnico/API_CONTRATOS.md, CONTRIBUTING.md, frontend/src/assets/tokens.css, frontend/src/assets/base.css y los archivos que voy a tocar.
Entrega por pasos: primero el plan y la lista de archivos a crear o modificar; espera mi aprobación antes de escribir código.
```

---

## Sección 1 · Prompts por tarea de sprint

Un prompt por tarea. **Cada tarea es una rama y un PR.** Hazlas en el orden de la tabla, porque algunas dependen de otras. ✅ = integrada en `develop`. El estado de cada sprint está en el [ROADMAP](../ROADMAP.md#sprints).

| Sprint | Tarea | Rama | CU | Depende de |
|---|---|---|---|---|
| 1 ✅ | [F1.1 Sesión y navbar unificada](#f11--sesión-y-navbar-unificada) | `feature/front-navbar-sesion` | 10, 22 | — |
| 1 ✅ | [F1.2 Rutas protegidas por rol](#f12--rutas-protegidas-por-rol) | `feature/front-rutas-por-rol` | 22 | F1.1 |
| 1 ✅ | [F1.3 Recuperar contraseña y validar registro](#f13--recuperar-contraseña-y-validar-registro) | `feature/front-recuperar-password` | 09, 11 | F1.1 |
| 1 ✅ | [F1.4 Panel de usuarios](#f14--panel-de-usuarios-admin) | `feature/front-panel-usuarios` | 19, 20, 21 | F1.2 |
| 1 ✅ | [F2.1 Sistema de diseño unificado](#f21--sistema-de-diseño-unificado) (adelantada al Sprint 1) | `feature/front-sistema-diseno` | RNF usabilidad | F1.1 |
| 2 ✅ | [F2.2 Catálogo desde la API](#f22--catálogo-desde-la-api) | `feature/front-catalogo-api` | 01, 02 | F2.1 |
| 2 ✅ | [F2.3 Panel de productos](#f23--panel-de-productos-admin) | `feature/front-admin-productos` | 12–15 | F1.2, F2.1 |
| 2 ✅ | [F2.4 Categorías, eliminar, galería y detalle](#f24--categorías-eliminar-productos-galería-y-detalle) | `feature/front-categorias-galeria` | 12–15 (extensión, decisión M) | F2.3 y la tarea B2.2 del backend |
| 3 ✅ | [F3.1 Carrito conectado a la API](#f31--carrito-conectado-a-la-api) | `feature/front-carrito-api` | 03–06 | F2.2 |
| 3 ✅ | [F3.2 Mis pedidos y detalle](#f32--mis-pedidos-y-detalle-del-pedido) | `feature/front-mis-pedidos` | 08 | F1.2 |
| 3 ✅ | [F3.3 Checkout y pago](#f33--checkout-y-pago-simulado) | `feature/front-checkout` | 07, 08 | F3.1, F3.2 |
| 4 ✅ | [F4.1 Tablero](#f41--tablero-de-control-admin) | `feature/front-dashboard` (junto con F4.2 y los pedidos del admin) | 16, 17 | F1.2 |
| 4 ✅ | [F4.2 Exportar informes](#f42--exportar-informes) | `feature/front-dashboard` (junto con F4.1) | 18 | F4.1 y la tarea B4.1 del backend |

Todos los prompts de esta sección terminan con el mismo **bloque de cierre**: explicación de cómo, por qué y para qué se hizo, cómo probarlo y pasos para el PR. Está incluido en cada uno para que se copien completos.

### F1.1 · Sesión y navbar unificada

> ✅ **Hecha.** Resultado: `components/Navbar.jsx` (después reemplazado por `BarraCliente` y `BarraAdmin` en el rediseño), `AuthContext` (con `isAdmin` y `verificando`) y `ApiError` en `services/api.js`. Este prompt queda como referencia.

```
TAREA F1.1 · Sprint 1 · CU-10, CU-22 · Rama: feature/front-navbar-sesion (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: una sola barra de navegación que refleje la sesión, y un manejo global de sesión inválida.

ESPECIFICACIONES:
- Reemplazar NavbarTienda.jsx y Navbar.jsx (heredada del laboratorio) por un único componente de navegación visible en la tienda y en las vistas de autenticación. Conservar el ícono del carrito a la derecha con su contador actual.
- Sin sesión: enlaces "Iniciar sesión" y "Registrarme". Con sesión: nombre del usuario, rol y botón "Cerrar sesión".
- Cambiar la marca visible "TIENDA PALMIRA" por "BIKE STORE" y actualizar la prueba que la verifica.
- AuthContext: renombrar las claves de localStorage `labcrud_token` y `labcrud_user` a `bikestore_token` y `bikestore_user` (si hay una sesión vieja guardada, se descarta). Exponer user, isAuthenticated, isAdmin, login y logout.
- Al cargar la app con un token guardado, validarlo con GET /auth/me (contrato adjunto). Si falla, cerrar la sesión.
- Manejo global: si cualquier petición responde 401, o 403 con code CUENTA_DESACTIVADA, cerrar la sesión, mostrar el message con ToastContext y llevar a /login. api.js no es un componente de React: propón cómo avisarle al AuthContext (por ejemplo, un callback registrado o un evento).
- Estilos con clases BEM propias del componente, sin depender de las raíces .lab o .tienda.

ARCHIVOS PROBABLES: components/NavbarTienda.jsx, components/Navbar.jsx, context/AuthContext.jsx, services/api.js, utils/storage.js, pages/TiendaPage.jsx, components/LabLayout.jsx, test/carrito.test.jsx.

CRITERIOS DE ACEPTACIÓN:
- Una sola navbar en todas las vistas, que cambia al iniciar y cerrar sesión.
- Una cuenta desactivada por un admin pierde la sesión en su siguiente petición.
- npm test y npm run build pasan.

FUERA DE ALCANCE: rutas protegidas (F1.2), recuperación de contraseña (F1.3), unificación completa de estilos (F2.1).

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F1.2 · Rutas protegidas por rol

> ✅ **Hecha.** Resultado: `ProtectedRoute` con roles, grupos `/admin` y `/cuenta` en `App.jsx` y `PanelLayout`. Las páginas nuevas de admin o de cliente se agregan dentro de su grupo. Después, el rediseño reemplazó `PanelLayout` por `AdminLayout` (admin) y `ClienteLayout` (cliente). Este prompt queda como referencia.

```
TAREA F1.2 · Sprint 1 · CU-22 · Rama: feature/front-rutas-por-rol (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: que las páginas privadas solo se muestren a quien tiene sesión y el rol correcto.

ESPECIFICACIONES:
- Extender components/ProtectedRoute.jsx para aceptar roles permitidos, por ejemplo <ProtectedRoute roles={['admin']} />.
- Sin sesión: redirigir a /login, recordando la ruta pedida para volver a ella después del login.
- Con sesión pero con un rol que no coincide: mostrar una página "No autorizado" (pages/NoAutorizadoPage.jsx) con un enlace a la tienda.
- Dejar en App.jsx la estructura de rutas preparada: /admin/* (solo admin) y /cuenta/* (solo cliente), cada una con su layout. Las páginas concretas llegan en tareas posteriores.
- Mostrar en la navbar el acceso "Administración" solo a los admin. Recordar que ocultar el enlace no es seguridad: el backend también valida el rol.
- Pruebas con MemoryRouter: sin sesión redirige, rol incorrecto muestra "No autorizado", rol correcto muestra la página.

ARCHIVOS PROBABLES: components/ProtectedRoute.jsx, App.jsx, pages/NoAutorizadoPage.jsx, pages/LoginPage.jsx, el componente de navegación, test/rutas.test.jsx.

CRITERIOS DE ACEPTACIÓN: los tres casos anteriores cubiertos por pruebas; npm test y npm run build pasan.

FUERA DE ALCANCE: el contenido de las páginas de admin (F1.4, F2.3, F4.1) y de cliente (F3.2).

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F1.3 · Recuperar contraseña y validar registro

> ✅ **Hecha.** Resultado: `pages/RecuperarPage.jsx`, `pages/RestablecerPage.jsx`, validaciones de correo y D7 en `utils/validaciones.js` (las mismas reglas del backend) y la lista de reglas `components/ReglasPassword.jsx`, usada en el registro y al restablecer. Pruebas en `test/validaciones.test.js` y `test/recuperacion.test.jsx`. Este prompt queda como referencia.

```
TAREA F1.3 · Sprint 1 · CU-09, CU-11 · Rama: feature/front-recuperar-password (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: pantallas de recuperación de contraseña y validaciones completas en el registro.

ESPECIFICACIONES:
- Página /recuperar: campo correo y llamada a POST /auth/recuperar. Mostrar SIEMPRE el message del backend.
- Si la respuesta trae data.token_desarrollo Y import.meta.env.DEV es true, mostrar un aviso "Modo desarrollo" con un enlace a /restablecer?token=<token>. Nunca en producción.
- Página /restablecer: lee el token de la URL, pide la nueva contraseña dos veces y llama a POST /auth/restablecer. Con code TOKEN_INVALIDO, mostrar el mensaje y un enlace a /recuperar. Al terminar, llevar a /login.
- Enlace "¿Olvidaste tu contraseña?" en LoginPage.
- RegisterPage: validar en el formulario el formato del correo y las reglas de contraseña D7 (mínimo 8 caracteres, con mayúscula, minúscula y número), con mensajes junto a cada campo; manejar 409 (correo ya registrado).
- Botones deshabilitados mientras se envía; mensajes con ToastContext.
- Referencia del flujo: sección 1 de docs/GUIA_PRUEBAS_LOCALES.md. Contratos: POST /auth/register, /auth/recuperar y /auth/restablecer (adjuntos).

ARCHIVOS PROBABLES: pages/RecuperarPage.jsx, pages/RestablecerPage.jsx, pages/RegisterPage.jsx, pages/LoginPage.jsx, services/auth.service.js, utils/ (validaciones), App.jsx, test/.

CRITERIOS DE ACEPTACIÓN: el flujo completo funciona contra la API local; pruebas de las validaciones del formulario; npm test y npm run build pasan.

FUERA DE ALCANCE: envío real por correo (Sprint 5).

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F1.4 · Panel de usuarios (admin)

> ✅ **Hecha.** Resultado: `pages/admin/UsuariosPage.jsx` con `components/UsuariosFiltros.jsx`, `components/UsuariosTabla.jsx` y `components/DialogoConfirmacion.jsx`; `services/usuarios.service.js` y `hooks/useDebounce.js` para la búsqueda. Pruebas en `test/usuarios.test.jsx`. Este prompt queda como referencia.

```
TAREA F1.4 · Sprint 1 · CU-19, CU-20, CU-21 · Rama: feature/front-panel-usuarios (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: página /admin/usuarios para que el administrador busque usuarios y cambie su rol o su estado.

ESPECIFICACIONES:
- Ruta protegida solo para admin (usar el ProtectedRoute de F1.2).
- Listado con GET /usuarios?q=&rol=&estado=: buscador por nombre o correo y filtros por rol y estado. Columnas: nombre, correo, rol, estado y acciones.
- Cambiar rol con PATCH /usuarios/:id/rol y estado con PATCH /usuarios/:id/estado, pidiendo confirmación con un diálogo propio (nunca confirm()).
- En la fila del propio admin, deshabilitar ambas acciones (D5 y D6). Si aun así llega code ACCION_SOBRE_SI_MISMO, mostrar el mensaje.
- Estados de carga, lista vacía y error. Actualizar la fila con la respuesta del backend, sin recargar todo.
- Contratos: sección "Usuarios · admin" de API_CONTRATOS.md (adjunto).

ARCHIVOS PROBABLES: pages/admin/UsuariosPage.jsx, components/ (tabla, filtros, diálogo de confirmación), services/usuarios.service.js, App.jsx, test/.

CRITERIOS DE ACEPTACIÓN: buscar, filtrar, cambiar rol y cambiar estado funcionan contra la API local; un usuario desactivado pierde su sesión (comportamiento de F1.1); pruebas con services mockeados; npm test y npm run build pasan.

FUERA DE ALCANCE: crear o borrar usuarios (no existe en los requerimientos).

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F2.1 · Sistema de diseño unificado

> ✅ **Hecha** (adelantada al Sprint 1): se eligió la opción C "Montaña Clara". Resultado: `assets/tokens.css` + `assets/base.css`. Después la **reemplazó el rediseño "Noche"** (tema oscuro y claro, ver la decisión "Diseño" del [ROADMAP](../ROADMAP.md#resueltas)); la estructura de archivos se mantiene. Este prompt queda como referencia.

```
TAREA F2.1 · Sprint 2 · RNF de usabilidad · Rama: feature/front-sistema-diseno (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: un solo sistema visual para toda la aplicación, en reemplazo de las hojas aisladas heredadas (lab.css con raíz .lab y tienda.css con raíz .tienda).

ESPECIFICACIONES:
- Definir variables CSS globales (colores, tipografía, espaciados, radios, sombras) y estilos base de botones, campos, tarjetas, tablas y mensajes.
- Migrar las vistas actuales (tienda, login, registro y las de las tareas del Sprint 1) al sistema nuevo; eliminar LabLayout y las raíces .lab y .tienda si dejan de ser necesarias.
- Eliminar los estilos sin uso del antiguo CRUD de equipos que siguen en lab.css (.equipos-*, .equipo-card*, .image-upload-field, .image-preview).
- Sin cambios de comportamiento: solo presentación. Accesible (contraste, foco visible) y responsive desde 360 px.

ARCHIVOS PROBABLES: assets/*.css, components/LabLayout.jsx, App.jsx, componentes y páginas existentes.

CRITERIOS DE ACEPTACIÓN: todas las pantallas se ven coherentes entre sí; no queda CSS sin uso; npm test y npm run build pasan sin cambiar la lógica de las pruebas.

FUERA DE ALCANCE: pantallas nuevas.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F2.2 · Catálogo desde la API

> ✅ **Hecha.** Resultado: `services/productos.service.js`; `TiendaPage` con categoría y orden en la URL (`?categoria=&orden=`) y estados de carga, error y vacío; `FiltrosCatalogo`, `ImagenProducto` (decisión L) y el destacado elegido con datos reales (el disponible más caro). `CarritoContext` guarda una copia de cada producto agregado y la actualiza al cargar el catálogo (carrito local hasta F3.1). Se eliminó `data/productos.js`. Las pruebas del instructor usan los productos reales de la semilla desde `test/fixtures/catalogo.js`, elegidos por lo que cada caso necesita, para que se adapten si el catálogo cambia. Este prompt queda como referencia.

```
TAREA F2.2 · Sprint 2 · CU-01, CU-02 · Rama: feature/front-catalogo-api (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: que la tienda muestre los productos reales de la API en lugar de los datos simulados de data/productos.js.

ESPECIFICACIONES:
- Cargar categorías con GET /categorias y productos con GET /productos?categoria=&orden= (orden: precio_asc | precio_desc). Contratos: sección "Catálogo y productos" de API_CONTRATOS.md (adjunto).
- Filtro por categoría y selector de orden por precio, sincronizados con la URL (?categoria=&orden=) para poder compartirlos.
- Tarjeta de producto con imagen (utils/urlImagen), nombre, precio en COP y disponibilidad. Con disponible = false, mostrar "Agotado" y deshabilitar "Agregar".
- Decisión L: si la imagen no existe (por ejemplo, las de la semilla), mostrar una imagen de reemplazo local (onError → assets/placeholder-producto.svg).
- La API usa id_producto y existencias, no id y stock. El carrito local debe seguir funcionando hasta F3.1: propone el ajuste mínimo en CarritoContext.
- Estados de carga, error y lista vacía.
- Pruebas: mockear services/ con vi.mock y adaptar las pruebas actuales del carrito a los datos nuevos sin perder casos.

ARCHIVOS PROBABLES: components/Catalogo.jsx, components/ProductCard.jsx, services/productos.service.js, context/CarritoContext.jsx, utils/format.js, assets/, test/.

CRITERIOS DE ACEPTACIÓN: se ven los 9 productos activos de la semilla con imagen de reemplazo; el filtro y el orden funcionan; npm test y npm run build pasan.

FUERA DE ALCANCE: carrito conectado a la API (F3.1); página de detalle de producto.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F2.3 · Panel de productos (admin)

```
TAREA F2.3 · Sprint 2 · CU-12, CU-13, CU-14, CU-15 · Rama: feature/front-admin-productos (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: página /admin/productos para listar, crear, editar e inactivar productos.

ESPECIFICACIONES:
- Ruta solo para admin, dentro de AdminLayout en App.jsx. En components/BarraAdmin.jsx, la sección "Productos" pasa de "Sprint 2" a enlace (ruta: '/admin/productos').
- Listado con GET /productos/admin?q=&categoria=&estado= (incluye inactivos): buscador por nombre y filtros por categoría y estado. Columnas: nombre, categoría, precio, existencias, estado y acciones.
- Crear con POST /productos (multipart/form-data, FormData con el campo `imagen`): nombre, descripción (opcional), precio > 0, existencias (entero ≥ 0), categoría e imagen obligatoria (jpg, png o webp de hasta 2 MB), validados en el formulario.
- Editar con GET /productos/admin/:id y PUT /productos/:id: actualización parcial; la imagen solo se envía si se elige una nueva.
- Activar o inactivar con PATCH /productos/:id/estado (borrado lógico, CU-14), con un diálogo de confirmación propio.
- Errores: code PRODUCTO_DUPLICADO marca el campo nombre; mostrar los mensajes de imagen inválida o demasiado grande.
- Contratos: sección "Catálogo y productos" de API_CONTRATOS.md (adjunto).

ARCHIVOS PROBABLES: pages/admin/ProductosPage.jsx, pages/admin/ProductoFormPage.jsx, components/, components/BarraAdmin.jsx, services/productos.service.js, App.jsx, test/.

CRITERIOS DE ACEPTACIÓN: crear con imagen, editar sin cambiar la imagen, editar cambiándola e inactivar funcionan contra la API local; pruebas con services mockeados; npm test y npm run build pasan.

FUERA DE ALCANCE: administrar categorías, eliminar productos y varias imágenes por producto. Se decidió hacerlos después, en B2.2 (backend) y F2.4 (frontend), cada uno con su plan.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F2.4 · Categorías, eliminar productos, galería y detalle

> ✅ **Hecha.** Resultado: `pages/admin/CategoriasPage.jsx`, `components/GaleriaProducto.jsx` (arrastrar y soltar con dnd-kit, más botones de mover), sección "Eliminar producto" en `ProductoFormPage.jsx` y `pages/ProductoPage.jsx` (detalle en la tienda). Pruebas en `categorias-admin.test.jsx`, `galeria.test.jsx`, `detalle.test.jsx` y `productos-admin.test.jsx`. Este prompt queda como referencia.

```
TAREA F2.4 · Sprint 2 · Extensión de CU-12 a CU-15 (decisión M) · Rama: feature/front-categorias-galeria (ya creada desde develop actualizado; si no, dame primero los comandos).
REQUISITO PREVIO: F2.3 y la tarea B2.2 del backend integradas.

OBJETIVO: interfaz para gestionar categorías, eliminar productos nunca usados, manejar la galería de cada producto y ver el detalle del producto en la tienda.

ESPECIFICACIONES (contratos en la sección "Catálogo y productos" de API_CONTRATOS.md, adjunto):
- /admin/categorias (solo admin, enlace en BarraAdmin): lista con total_productos; crear; renombrar en la misma fila (Enter guarda, Escape cancela); eliminar con DialogoConfirmacion, deshabilitado si tiene productos. CATEGORIA_DUPLICADA marca el campo; CATEGORIA_CON_PRODUCTOS avisa y refresca.
- Eliminar producto: sección al final de la edición, con confirmación. Si responde PRODUCTO_CON_PEDIDOS, ofrecer "Inactivar en su lugar".
- Galería en la edición: portada + hasta 4 imágenes (contador "N de 5"); agregar (validación de tipo y tamaño en el navegador), quitar con confirmación, hacer portada y reordenar arrastrando (dnd-kit: mouse, táctil y teclado, con anuncios en español) o con botones de mover. Cada acción se guarda al momento; reordenar se ve de inmediato y vuelve atrás si la API falla. Después de crear un producto se pasa a su edición.
- /producto/:id (pública, no admin): portada y miniaturas, datos, descripción y agregar al carrito local; "Producto no disponible" si es 404. La imagen y el nombre de cada tarjeta, y el destacado, llevan al detalle.
- La dependencia nueva (dnd-kit) va en un commit aparte.

ARCHIVOS PROBABLES: pages/admin/CategoriasPage.jsx, pages/ProductoPage.jsx, components/GaleriaProducto.jsx, pages/admin/ProductoFormPage.jsx, services/, App.jsx, BarraAdmin.jsx, test/.

CRITERIOS DE ACEPTACIÓN: todo funciona contra la API local, incluido arrastrar con mouse y teclado; las pruebas del carrito del instructor siguen pasando; npm test y npm run build pasan.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F3.1 · Carrito conectado a la API

> ✅ **Hecha.** Se ajustó D1 por decisión del equipo: el visitante puede armar su carrito en el navegador y solo al comprar se le pide iniciar sesión; al entrar, su carrito pasa a la API. Resultado: `services/carrito.service.js`, `CarritoContext` con modo visitante y modo cliente (proveedor en `App.jsx`), `CarritoPanel` con los motivos de D4 y el botón "Comprar", y `pages/cuenta/CheckoutPage.jsx` provisional hasta F3.3. Los casos del instructor (`carrito.test.jsx`) no cambiaron: prueban el modo visitante; el modo cliente está en `carrito-api.test.jsx`. Este prompt queda como referencia (su punto sobre D1 quedó reemplazado por el ajuste).

```
TAREA F3.1 · Sprint 3 · CU-03, CU-04, CU-05, CU-06 · Rama: feature/front-carrito-api (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: que el carrito deje de usar localStorage y viva en la base de datos a través de la API.

ESPECIFICACIONES:
- CarritoContext usa GET /carrito, POST /carrito/items, PUT /carrito/items/:id_producto y DELETE /carrito/items/:id_producto. Contratos: sección "Carrito · cliente" de API_CONTRATOS.md (adjunto).
- D1: el carrito exige sesión de cliente. Si alguien sin sesión pulsa "Agregar", llevarlo a /login y volver después. Los admin no tienen carrito (la API responde 403).
- El estado del carrito es la respuesta del backend: no recalcular totales en el frontend. El carrito trae id_pedido (es un pedido en estado 'carrito'), no id_carrito; id_pedido es null si el cliente todavía no tiene carrito (GET /carrito no lo crea).
- Mostrar los ítems con disponible = false según su `motivo` (INACTIVO, SIN_STOCK, SUPERA_STOCK), como pide D4.
- STOCK_MAXIMO → toast "Este es el máximo de producto disponible en stock". CANTIDAD_MINIMA → toast con botón "Sí, eliminar" que llama a DELETE.
- El botón "Comprar" lleva a /checkout y queda deshabilitado si puede_comprar = false.
- Contador de la navbar con total_unidades del backend.
- Adaptar test/carrito.test.jsx: indicar qué casos cambian y por qué, sin perder cobertura.

ARCHIVOS PROBABLES: context/CarritoContext.jsx, components/CarritoPanel.jsx, components/ProductCard.jsx, components/CantidadInput.jsx, services/carrito.service.js, test/carrito.test.jsx.

CRITERIOS DE ACEPTACIÓN: el carrito se conserva al cerrar sesión y volver a entrar (CU-06); los productos inactivos se marcan y bloquean la compra; npm test y npm run build pasan.

FUERA DE ALCANCE: checkout (F3.3).

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F3.2 · Mis pedidos y detalle del pedido

> ✅ **Hecha.** Resultado: `services/pedidos.service.js`, `utils/pedidos.js` (textos de estados y medios de pago, formato de fecha), `pages/cuenta/PedidosPage.jsx` y `PedidoDetallePage.jsx`, con "Pagar" deshabilitado hasta F3.3. Pruebas en `pedidos.test.jsx` con pedidos de prueba del fixture (`PEDIDOS`, `pedidoEn`, `pedidosSimulado`). Este prompt queda como referencia.

```
TAREA F3.2 · Sprint 3 · CU-08 · Rama: feature/front-mis-pedidos (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: que el cliente vea su historial de pedidos y el detalle de cada uno. El detalle también sirve como página de confirmación tras pagar (F3.3).

ESPECIFICACIONES:
- /cuenta/pedidos (solo cliente): listado con GET /pedidos con número de pedido, fecha_pedido (en hora local), estado y total en COP. La API nunca incluye el carrito en esta lista.
- /cuenta/pedidos/:numero: detalle con GET /pedidos/:numero (por ejemplo BS-2026-000001): fecha_pedido, productos con cantidad, precio unitario y subtotal, dirección de envío, total y pagos (medio, últimos 4 dígitos, valor, estado y fecha). 404 → "Pedido no encontrado".
- Si el pedido está en estado fallido o pendiente, mostrar un botón "Pagar" que lleve al paso de pago de F3.3. Mientras F3.3 no exista, déjalo preparado.
- Contratos: sección "Pedidos y pago · cliente" de API_CONTRATOS.md (adjunto).

ARCHIVOS PROBABLES: pages/cuenta/PedidosPage.jsx, pages/cuenta/PedidoDetallePage.jsx, services/pedidos.service.js, components/, App.jsx, test/.

CRITERIOS DE ACEPTACIÓN: con pedidos creados desde la API (sección 3 de docs/GUIA_PRUEBAS_LOCALES.md), el listado y el detalle se ven correctos; npm test y npm run build pasan.

FUERA DE ALCANCE: crear pedidos o pagar (F3.3).

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F3.3 · Checkout y pago simulado

> ✅ **Hecha.** Resultado: `pages/cuenta/CheckoutPage.jsx` (resumen, envío y pago), `components/FormularioPago.jsx`, `pages/cuenta/PagarPedidoPage.jsx` (`/cuenta/pedidos/:numero/pagar`), "Pagar" activo y confirmación en `PedidoDetallePage.jsx`, `utils/departamentos.js` y `validarEnvio` / `validarPago` en `utils/validaciones.js`. Pruebas en `checkout.test.jsx` con el carrito y los pedidos simulados juntos (`pedidosSimulado({ carrito })`). Este prompt queda como referencia.

```
TAREA F3.3 · Sprint 3 · CU-07, CU-08 · Rama: feature/front-checkout (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: flujo de compra completo: resumen, dirección de envío, pago simulado y confirmación.

ESPECIFICACIONES:
- /checkout (solo cliente). Paso 1, resumen: datos de GET /carrito; si puede_comprar = false, volver al carrito con el aviso correspondiente (CU-07).
- Paso 2, envío: formulario con envio_nombre, envio_telefono, envio_departamento, envio_ciudad y envio_direccion (todos obligatorios) → POST /pedidos, que confirma el carrito: el carrito queda vacío en ese momento (refrescar CarritoContext) y la respuesta es el pedido 'pendiente' con su numero_pedido. Con 409 CARRITO_NO_DISPONIBLE, volver al carrito mostrando data.items.
- Paso 3, pago: medio_pago (tarjeta_credito, tarjeta_debito o cuenta_bancaria) y número → POST /pedidos/:id/pagos.
  · 201 → ir al detalle del pedido de F3.2 (/cuenta/pedidos/:numero).
  · 402 PAGO_RECHAZADO → mostrar el rechazo y permitir reintentar con el mismo pedido (decisión F).
  · 409 SIN_STOCK → mostrar data.items y volver al carrito (no se cobró nada).
  · 409 PEDIDO_YA_PAGADO → ir al detalle.
- El número de tarjeta o cuenta nunca se guarda en el estado global, ni en localStorage, ni en la consola. Validar la longitud en el formulario (tarjetas 13–19 dígitos, cuenta 6–20) y mostrarlo enmascarado al confirmar.
- Para probar: un número terminado en 0000 simula el rechazo (sección 2 de docs/GUIA_PRUEBAS_LOCALES.md).
- Contratos: sección "Pedidos y pago · cliente" de API_CONTRATOS.md (adjunto).

ARCHIVOS PROBABLES: pages/cuenta/CheckoutPage.jsx, components/ (pasos, formularios), services/pedidos.service.js, context/CarritoContext.jsx (refrescar tras confirmar), test/.

CRITERIOS DE ACEPTACIÓN: compra aprobada, rechazo con reintento y falta de stock funcionan contra la API local; el carrito queda vacío tras confirmar (antes de pagar); un pago rechazado se reintenta sobre el mismo pedido; npm test y npm run build pasan.

FUERA DE ALCANCE: pasarela de pago real.

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F4.1 · Tablero de control (admin)

> ✅ **Hecha** (en un solo PR con F4.2 y las pantallas de pedidos del admin, decisión N). Resultado: `pages/admin/DashboardPage.jsx` (cargada con `React.lazy`), `components/FiltrosTablero.jsx` (filtros en la URL, atajos "Este mes" y "Últimos 30 días"), `GraficaMasVendidos.jsx` (recharts) y `AlertasTablero.jsx`, `services/dashboard.service.js` y `utils/fechas.js`. Pedidos del admin: `pages/admin/PedidosAdminPage.jsx` y `PedidoAdminPage.jsx`, con `components/DetallePedido.jsx` y `hooks/usePedido.js` compartidos con el detalle del cliente. Pruebas en `tablero.test.jsx`, `pedidos-admin.test.jsx` y `servicios-tablero.test.js` con `fixtures/tablero.js`. Este prompt queda como referencia.

```
TAREA F4.1 · Sprint 4 · CU-16, CU-17 · Rama: feature/front-dashboard (ya creada desde develop actualizado; si no, dame primero los comandos).

OBJETIVO: página /admin/dashboard con las métricas de ventas y las alertas operativas.

ESPECIFICACIONES:
- Ruta solo para admin, dentro de AdminLayout en App.jsx. En components/BarraAdmin.jsx, la sección "Tablero" pasa de "Sprint 4" a enlace (ruta: '/admin/dashboard').
- Filtros: rango de fechas (desde y hasta, formato AAAA-MM-DD) y categoría (GET /categorias). Validar en el formulario que desde ≤ hasta.
- GET /dashboard/metricas?desde=&hasta=&categoria=: tarjetas con ventas totales (COP), cantidad de pedidos y unidades vendidas, y tabla de los 5 más vendidos.
- GET /dashboard/alertas: stock bajo (mostrar el umbral), agotados, productos inactivos dentro de carritos, pedidos pendientes y fallidos (con fecha_pedido).
- Estados de carga, error y "sin ventas en el periodo".
- Contratos: sección "Tablero · admin" de API_CONTRATOS.md (adjunto).

ARCHIVOS PROBABLES: pages/admin/DashboardPage.jsx, components/ (tarjetas, tablas, filtros), components/BarraAdmin.jsx, services/dashboard.service.js, App.jsx, test/.

CRITERIOS DE ACEPTACIÓN: las cifras coinciden con las de la API para el mismo filtro; npm test y npm run build pasan.

FUERA DE ALCANCE: exportar (F4.2); gráficas avanzadas (opcional, solo si no agregan dependencias pesadas).

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

### F4.2 · Exportar informes

> ✅ **Hecha** (en un solo PR con F4.1). Resultado: `apiArchivo` en `services/api.js` (misma sesión y errores que `api`, pero devuelve `{ blob, nombre }` con el nombre de `Content-Disposition`), `descargarInforme` en `services/dashboard.service.js` y `utils/descarga.js` (URL temporal + enlace con `download`). Este prompt queda como referencia.

```
TAREA F4.2 · Sprint 4 · CU-18 · Rama: feature/front-exportar-informes (ya creada desde develop actualizado; si no, dame primero los comandos).
REQUISITO PREVIO: la tarea B4.1 del backend (exportación) debe estar integrada en develop.

OBJETIVO: botones para descargar el informe del tablero en Excel y en PDF, con los mismos filtros activos.

ESPECIFICACIONES:
- Endpoint: GET /dashboard/exportar?formato=xlsx|pdf&desde=&hasta=&categoria= (solo admin). La respuesta es un archivo, no JSON. Contrato en la sección "Tablero · admin" de API_CONTRATOS.md (adjunto).
- Como la petición necesita el token Bearer, no sirve un enlace <a href> normal: agregar en services/ una función que pida el archivo como blob con api.js (o una variante para binarios), cree una URL temporal y dispare la descarga con el nombre de Content-Disposition.
- Si la API responde un error (JSON), mostrar su message con ToastContext.
- Deshabilitar los botones mientras se descarga.

ARCHIVOS PROBABLES: services/api.js, services/dashboard.service.js, pages/admin/DashboardPage.jsx, test/.

CRITERIOS DE ACEPTACIÓN: se descargan un .xlsx y un .pdf que se abren correctamente; npm test y npm run build pasan.

FUERA DE ALCANCE: generar los archivos en el navegador (decisión D11: se generan en el backend).

AL TERMINAR LA IMPLEMENTACIÓN entrega, en este orden:
1. EXPLICACIÓN: para cada archivo creado o modificado, cómo se hizo, por qué se hizo así (y qué alternativa se descartó, si la hubo) y para qué sirve dentro del proyecto. Directo y al grano, pero sin omitir ningún concepto ni término técnico importante; si usas uno que no esté en docs/GLOSARIO.md, defínelo en una línea.
2. CÓMO PROBARLO: comandos (npm test, npm run build) y qué revisar en el navegador.
3. PASOS PARA SUBIRLO según CONTRIBUTING.md, con comandos exactos: commits sugeridos (Conventional Commits), git fetch origin y git merge origin/develop, volver a probar, git push -u origin <rama>, y el título y la descripción del PR hacia develop llenando .github/pull_request_template.md. Indica qué hace el Dev Backend (revisar y aprobar) y los comandos para después del merge (git switch develop, git pull, git branch -d <rama>).
```

---

## Sección 2 · Prompts de apoyo

Problemas puntuales que aparecen en **cualquier** tarea. No implementan una funcionalidad del sprint: resuelven un paso concreto dentro de ella. Úsalos en el mismo chat de la tarea, después del Prompt 0.

| Prompt | Úsalo cuando… |
|---|---|
| [A1 Componente visual](#a1--componente-visual) | necesitas una pieza de interfaz reutilizable aislada |
| [A2 Consumir un endpoint](#a2--consumir-un-endpoint) | debes conectar una pantalla con un endpoint que no cubre tu tarea |
| [A3 Datos simulados](#a3--datos-simulados-sin-backend) | quieres maquetar sin depender de la API |
| [A4 Estado global](#a4--estado-global-contexto) | dudas si un dato va en un contexto o en el componente |
| [A5 Formulario con validaciones](#a5--formulario-con-validaciones) | armas un formulario fuera de las tareas que ya lo describen |
| [A6 Error de integración](#a6--error-de-integración-con-el-backend) | la API responde algo inesperado |
| [A7 Pruebas de un componente](#a7--pruebas-de-un-componente) | necesitas pruebas adicionales |
| [A8 Conflicto de merge](#a8--conflicto-de-merge) | `git merge origin/develop` marca conflictos |
| [A9 Revisión antes del PR](#a9--revisión-antes-de-abrir-el-pr) | vas a abrir el PR y quieres una revisión previa |

### A1 · Componente visual

**Para qué sirve:** crear un componente reutilizable que solo reciba datos por [props](../GLOSARIO.md#props), sin llamar a la API.
**Cuándo usarlo:** cuando una tarea necesita una pieza visual que conviene separar (una tabla, un diálogo, una tarjeta).

```
Necesito el componente [NombreComponente] para [CU-XX / tarea].
Debe mostrar: [datos]. Interacciones: [clics, estado vacío, cargando, error].
Recibe por props: [lista de props]. No hace fetch.
Ubicación: frontend/src/components/[NombreComponente].jsx. Estilos con el sistema de diseño del proyecto y clases BEM prefijadas por el componente.
Requisitos: accesible (labels, aria-label en botones que solo tienen ícono, foco visible), responsive desde 360 px.
Dame el código completo, un ejemplo de uso desde [Pagina] y al final explica en pocas líneas cómo funciona y por qué se diseñó así.
```

### A2 · Consumir un endpoint

**Para qué sirve:** crear la función de `services/` para un endpoint y usarla en una página manejando carga, errores y lista vacía.
**Cuándo usarlo:** cuando necesitas un endpoint que tu tarea no detalla.

```
Contrato (copiado de docs/diseno-tecnico/API_CONTRATOS.md):
[pega el bloque del endpoint, incluidos sus errores y codes]
Crea o actualiza frontend/src/services/[modulo].service.js con la función [nombreFuncion] usando api.js y devolviendo `respuesta.data`.
Luego muéstrame cómo usarla en pages/[Pagina].jsx manejando: cargando, error (mostrar el message del backend con ToastContext y reaccionar a estos codes: [lista]) y lista vacía.
No cambies la forma de los datos que define el contrato. Al final explica brevemente el flujo de la petición.
```

### A3 · Datos simulados sin backend

**Para qué sirve:** maquetar una vista con [datos simulados](../GLOSARIO.md#mock) que tienen la misma forma que la API.
**Cuándo usarlo:** si la API no está corriendo en tu PC o quieres probar estados raros (vacío, error) sin preparar datos.

```
Quiero trabajar la vista [Pagina] sin depender del backend corriendo.
Contrato: [pega el contrato].
Crea un mock en frontend/src/data/[modulo].mock.js con datos realistas de bicicletas y accesorios, y que services/[modulo].service.js devuelva una Promise con la misma forma { ok, data } (con un retardo simulado) cuando VITE_USAR_MOCK=true.
El cambio entre mock y API real no debe tocar los componentes. Explica al final cómo activarlo y desactivarlo.
```

### A4 · Estado global (contexto)

**Para qué sirve:** decidir y crear un [contexto](../GLOSARIO.md#contexto) de React para un dato compartido.
**Cuándo usarlo:** cuando varios componentes necesitan el mismo dato y no sabes dónde ponerlo.

```
Necesito manejar [qué estado: sesión, carrito, filtros...] compartido entre [componentes/páginas].
Archivo actual: [adjunta el contexto si existe].
Propón si va en un contexto existente o en uno nuevo, y justifica en 2 líneas. Expón solo funciones con nombres de negocio (agregar, eliminar), no setState.
Mantén compatibles las pruebas de frontend/src/test/ y dime cuáles hay que actualizar.
```

### A5 · Formulario con validaciones

**Para qué sirve:** construir un formulario con validación por campo, envío y manejo de errores del backend.
**Cuándo usarlo:** para formularios que ninguna tarea de la sección 1 describe.

```
Formulario de [qué] para CU-[XX].
Campos y reglas: [campo: obligatorio, formato, mínimo/máximo...]. Si hay contraseña: mínimo 8 caracteres, con mayúscula, minúscula y número (D7).
Mensajes de error junto a cada campo y un toast al enviar. Deshabilitar el botón mientras se envía.
Si el backend responde { ok:false, message, code }, mostrar ese mensaje.
Envío mediante services/[modulo].service.js. Para imágenes: FormData con el campo `imagen` (api.js ya omite el Content-Type).
```

### A6 · Error de integración con el backend

**Para qué sirve:** diagnosticar si un fallo está en el frontend o en la API, sin tocar `backend/`.
**Cuándo usarlo:** cuando una petición responde con un estado o unos datos que no esperabas.

```
Al llamar [MÉTODO /ruta] desde [Pagina] obtengo: [status, cuerpo de la respuesta, captura de Network/Console].
Request enviado: [body/headers]. Contrato esperado: [pega contrato].
Determina si el problema está en el frontend (servicio, token, formato, CORS) o en el backend. Si es del backend, redacta el reporte para el Dev Backend en lugar de modificar backend/. Explica la causa en pocas líneas.
```

### A7 · Pruebas de un componente

**Para qué sirve:** escribir pruebas con [Vitest y Testing Library](../GLOSARIO.md#vitest) aislando la API.
**Cuándo usarlo:** para aumentar la cobertura más allá de lo que pide la tarea, o para reproducir un error.

```
Escribe pruebas Vitest + Testing Library para [Componente/Página] en frontend/src/test/[nombre].test.jsx.
Casos: [lista, ej. muestra el estado vacío, deshabilita el botón sin stock, muestra el toast de error con code X].
Mockea services/ con vi.mock; no hagas llamadas reales. Usa consultas accesibles (getByRole, getByLabelText). Explica qué verifica cada prueba.
```

### A8 · Conflicto de merge

**Para qué sirve:** resolver un [conflicto](../GLOSARIO.md#conflicto) sin perder cambios de nadie.
**Cuándo usarlo:** cuando `git merge origin/develop` en tu rama marca archivos en conflicto (ver la [sección 5 de CONTRIBUTING](../../CONTRIBUTING.md#5-pull-requests)).

```
Al hacer git merge origin/develop en mi rama feature/front-[modulo] tengo conflicto en [archivo].
Pego el bloque con las marcas <<<<<<< ======= >>>>>>>:
[bloque]
Explícame qué trae cada lado y propón la versión final que conserve ambos cambios. Luego dame los comandos para terminar el merge sin usar --force.
```

### A9 · Revisión antes de abrir el PR

**Para qué sirve:** una revisión previa del diff para que el PR llegue limpio a la aprobación.
**Cuándo usarlo:** justo antes de abrir el PR, como indica la [sección 5 de CONTRIBUTING](../../CONTRIBUTING.md#5-pull-requests).

```
Revisa este diff antes de abrir el PR hacia develop:
[pega git diff origin/develop...HEAD -- frontend/]
Verifica: fetch fuera de services/, URLs a mano, alert()/confirm(), console.log olvidados, archivos fuera de frontend/, lógica de negocio en componentes que debería estar en un contexto, errores manejados por code, accesibilidad básica.
Devuélveme una lista corta de problemas y un título + descripción para el PR según .github/pull_request_template.md.
```

---

**Ver también:** [GUIA_PROMPTS_BACKEND](GUIA_PROMPTS_BACKEND.md) · [API_CONTRATOS](../diseno-tecnico/API_CONTRATOS.md) · [ARQUITECTURA](../diseno-tecnico/ARQUITECTURA.md) · [ROADMAP](../ROADMAP.md) · [CONTRIBUTING](../../CONTRIBUTING.md)

# Bike Store · Frontend

SPA en React 19 + Vite 7 + React Router 7. Es la capa de presentación y consume la API de `../backend`.

## Requisitos

- Node.js 22.12+ (recomendado 26 LTS)
- Backend corriendo en `http://localhost:3000`, con PostgreSQL: [GUIA_EJECUCION_LOCAL](../docs/GUIA_EJECUCION_LOCAL.md). Desde F2.2 la tienda también lo necesita: el catálogo viene de la API.

## Instalar y ejecutar

```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas (Vitest + Testing Library)
npm run build      # versión de producción en dist/
```

## Usuarios de prueba

- **Admin:** `admin@bikestore.local` / `CambiaEsta123` (lo crea el backend al arrancar).
- **Cliente:** regístralo en `/registro`. La contraseña debe tener mínimo 8 caracteres, con mayúscula, minúscula y número.

## Rutas actuales

| Ruta | Acceso | Vista |
|------|--------|-------|
| `/?categoria=&orden=` | Pública (no admin) | Tienda: catálogo de la API con filtro por categoría y orden por precio (`precio_asc` / `precio_desc`) guardados en la URL para compartirlos, producto destacado, búsqueda por nombre y carrito (en el navegador para visitantes y en la API para clientes, F3.1) |
| `/producto/:id` | Pública (no admin) | Detalle del producto: portada y galería con miniaturas, datos, descripción y agregar al carrito. Se llega desde la imagen o el nombre de cada tarjeta, o desde el destacado |
| `/login`, `/registro` | Pública (no admin) | Autenticación, conectada a la API. El login vuelve a la ruta protegida que se intentó abrir |
| `/recuperar` | Pública (no admin) | Pide el enlace de recuperación de contraseña (CU-11). En desarrollo muestra el enlace en pantalla, porque aún no hay envío de correos |
| `/restablecer?token=...` | Pública (no admin) | Crea la contraseña nueva con el token del enlace (CU-11) |
| `/admin` | Solo `admin` | Panel de administración: tarjetas de las secciones (el tablero llega en F4.1) |
| `/admin/usuarios` | Solo `admin` | Buscar usuarios y cambiar su rol o su estado (CU-19 a CU-21) |
| `/admin/productos` | Solo `admin` | Buscar productos (incluye los inactivos) por nombre, categoría y estado; activarlos o inactivarlos (CU-14, CU-15) |
| `/admin/productos/nuevo` | Solo `admin` | Crear un producto con su imagen (CU-12) |
| `/admin/productos/:id` | Solo `admin` | Editar un producto: solo se envían los campos que cambian, y la imagen solo si se elige otra (CU-13). Debajo: la galería (agregar, quitar, hacer portada y ordenar arrastrando; se guarda al momento) y "Eliminar producto" (solo si nunca se usó) |
| `/admin/categorias` | Solo `admin` | Crear, renombrar y eliminar categorías sin productos (decisión M) |
| `/cuenta` | Solo `cliente` | Mi cuenta, con el enlace a "Mis pedidos" |
| `/cuenta/pedidos` | Solo `cliente` | Mis pedidos: número, fecha (hora del navegador), estado y total, del más reciente al más antiguo (F3.2) |
| `/cuenta/pedidos/:numero` | Solo `cliente` | Detalle del pedido: productos al precio con que se confirmó (R3), envío y cada intento de pago (medio, últimos 4 dígitos, estado). Si está pendiente o rechazado muestra "Pagar" (se activa en F3.3). También será la confirmación después de pagar |
| `/checkout` | Solo `cliente` | Finalizar compra. Provisional en F3.1 (resumen del carrito); F3.3 agrega envío y pago. Un visitante que pulsa "Comprar" pasa antes por el login y vuelve aquí |

Estructura (rediseño):
- **Cliente y público:** barra superior `components/BarraCliente.jsx`. La tienda la usa directamente (le pasa el carrito y la búsqueda); las páginas de acceso y Mi cuenta van dentro de `ClienteLayout`.
- **Administrador:** `components/AdminLayout.jsx`, con la barra lateral `BarraAdmin.jsx` (en pantallas angostas pasa arriba, con el botón "Abrir menú"). **El admin solo ve su panel:** `components/SinAdmin.jsx` envuelve las rutas del cliente y lo lleva a `/admin`, y al iniciar sesión siempre termina en `/admin`. "(no admin)" en la tabla significa esto.

Las rutas privadas usan `components/ProtectedRoute.jsx` (`<ProtectedRoute roles={['admin']} />`):
- mientras se valida la sesión muestra "Verificando sesión…";
- sin sesión lleva a `/login`;
- con otro rol muestra "No autorizado" en la misma URL (en la práctica, un cliente que abre `/admin`).

Para agregar una página privada, ponla dentro del grupo de su rol en `App.jsx`. Si es de admin, convierte también su sección de `BarraAdmin.jsx` en enlace (campo `ruta`).

Las demás pantallas (catálogo real, carrito real, checkout, pedidos, recuperar contraseña, secciones de los paneles) se construyen por sprints: [ROADMAP](../docs/ROADMAP.md). El backend de todas ya existe: [API_CONTRATOS](../docs/diseno-tecnico/API_CONTRATOS.md).

## Puntos clave

- Los componentes no hacen `fetch`: todo pasa por `src/services/`, y `api.js` agrega el token Bearer.
- La API responde `{ ok, data, message, code }`: los datos se leen en `respuesta.data`. Los errores llegan como `ApiError` (`message`, `status`, `code`, `data`) y se manejan por `code`.
- Proveedores globales en `App.jsx`, en este orden: Router → `TemaProvider` → `ToastProvider` → `AuthProvider`. Los mensajes al usuario van con `useToast().mostrar()`, nunca con `alert()`.
- Dos barras, una por tipo de usuario: `BarraCliente.jsx` (superior) y `BarraAdmin.jsx` (lateral). El carrito y la búsqueda solo aparecen cuando la tienda se los pasa a `BarraCliente` (`carrito`, `busqueda`); el carrito siempre es el último elemento a la derecha (pruebas del instructor).
- **Sistema de diseño "Noche"**, con tema oscuro (por defecto) y claro:
  - `assets/tokens.css` es la única fuente de colores, tipografía, espacios, radios y sombras. Tiene un bloque por tema (`:root[data-tema="oscuro"]` y `:root[data-tema="claro"]`) con **los mismos nombres de variables**. Nunca escribas un color a mano: usa `var(--…)`, y el componente funcionará en los dos temas.
  - Texto sobre un fondo de color: usa la variable `--color-sobre-…` de ese fondo (`--color-sobre-primario`, `--color-sobre-acento`, `--color-sobre-error`), nunca `#ffffff`. Enlaces: `--color-enlace`.
  - El tema lo maneja `context/TemaContext.jsx` (`useTema()` → `tema`, `alternarTema`) y lo cambia `components/BotonTema.jsx`. Se guarda en `localStorage` (`bikestore_tema`); `index.html` lo aplica antes de que React arranque para evitar un destello del otro tema.
  - `assets/base.css` trae la base global y los componentes reutilizables: `.contenedor`, `.btn` con sus variantes (`--primario`, `--suave`, `--acento`, `--peligro`, `--bloque`), `.icono-btn`, `.campo` / `.input`, `.tarjeta`, `.etiqueta--exito|aviso|error|acento|destacado`, `.alerta--error` y `.solo-lector`.
  - Cada vista tiene su `.css` con clases BEM propias: `barra-cliente.css`, `barra-admin.css`, `toast.css`, `tienda.css`, `auth.css`, `panel.css`, `usuarios.css`, `productos.css`, `categorias.css`, `galeria.css`, `detalle.css` y `dialogo.css`. Los botones segmentados de los filtros son el componente `Segmentado.jsx` (con `segmentado.css`), compartido por usuarios y productos.
  - Tipografía Inter, cargada desde Google Fonts en `index.html`.
- Pruebas de la tienda: simulan `services/productos.service.js` con `test/fixtures/catalogo.js`, que tiene los productos de la semilla con la forma de la API. Las pruebas no escriben nombres ni precios a mano: eligen productos con sus selectores (`conStockMinimo`, `conPocoStock`, `masCaroDisponible`…). Si la semilla cambia o crece, solo se actualiza ese archivo. Las pruebas del panel de productos (`test/productos-admin.test.jsx`) usan el mismo archivo: `catalogoAdmin`, `productoPorId`, `unActivo` y `unInactivo`.
- Arrastrar y soltar (galería de productos): [dnd-kit](https://dndkit.com) (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`). Funciona con mouse, pantalla táctil y teclado; los anuncios para el lector de pantalla están en español en `GaleriaProducto.jsx`. jsdom no tiene medidas de pantalla, así que en las pruebas se reordena con los botones de mover.
- Para pedir ayuda sin romper la arquitectura: [GUIA_PROMPTS_FRONTEND](../docs/guias-prompts/GUIA_PROMPTS_FRONTEND.md).

## Carrito (F3.1, decisión D1)

`context/CarritoContext.jsx` (proveedor en `App.jsx`, dentro de `AuthProvider`) ofrece las mismas funciones en dos modos:

- **Visitante** (sin sesión): el carrito vive en el navegador (`localStorage`, clave `bikestore_carrito`), como antes.
- **Cliente:** el carrito vive en la API (`services/carrito.service.js`): es su pedido en estado `carrito` (D12). Cada operación se envía a la API y el carrito se reemplaza con la respuesta; totales, unidades y `puede_comprar` los calcula el backend. Las operaciones van en cola (una detrás de otra) para que un doble clic no mande dos peticiones que se crucen. Los errores se manejan por `code`: `STOCK_MAXIMO` → toast de máximo; `CANTIDAD_MINIMA` → toast con "Sí, eliminar".
- **Al iniciar sesión un cliente**, lo que había en el navegador pasa a su carrito de la API (se suma sin superar el stock, con aviso si algo no cabe) y el navegador queda vacío. Si no hay conexión, los productos se conservan en el navegador para el siguiente intento.
- El panel marca los ítems no disponibles según su `motivo` (D4: `INACTIVO`, `SIN_STOCK`, `SUPERA_STOCK`) y deshabilita "Comprar" mientras `puede_comprar` sea `false`.
- Pruebas: `carrito.test.jsx` (casos del instructor, modo visitante) y `carrito-api.test.jsx` (modo cliente y paso del carrito al iniciar sesión, con `carritoSimulado()` del fixture).

## Flujo de sesión

Login → `AuthContext` guarda `data.token` y `data.user` en `localStorage` (`bikestore_token`, `bikestore_user`) → `api.js` agrega `Authorization: Bearer` → el backend verifica el JWT y, en cada petición, el estado y el rol del usuario.

- Al abrir la app con un token guardado, `AuthContext` lo valida con `GET /auth/me` y refresca nombre y rol. Mientras tanto, `verificando` es `true`.
- Si una petición con token responde 401, o 403 con `CUENTA_DESACTIVADA`, `api.js` avisa al `AuthContext` (callback registrado con `registrarManejadorSesionInvalida`): se cierra la sesión, se muestra el mensaje y se va a `/login`.

Ocultar un botón en React no es seguridad: el backend también verifica el rol.

# Bike Store · Frontend

SPA en React 19 + Vite 7 + React Router 7. Es la capa de presentación y consume la API de `../backend`.

## Requisitos

- Node.js 22+ (recomendado 24 LTS)
- Backend corriendo en `http://localhost:3000`, con PostgreSQL: [GUIA_EJECUCION_LOCAL](../docs/GUIA_EJECUCION_LOCAL.md). La tienda funciona sin backend porque aún usa datos simulados, pero el login y el registro lo necesitan.

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
| `/` | Pública | Tienda: catálogo + carrito (aún con datos simulados en `src/data/productos.js`) |
| `/login`, `/registro` | Pública | Autenticación, conectada a la API. El login vuelve a la ruta protegida que se intentó abrir |
| `/recuperar` | Pública | Pide el enlace de recuperación de contraseña (CU-11). En desarrollo muestra el enlace en pantalla, porque aún no hay envío de correos |
| `/restablecer?token=...` | Pública | Crea la contraseña nueva con el token del enlace (CU-11) |
| `/admin` | Solo `admin` | Panel de administración (inicio provisional: las secciones llegan en F2.3 y F4.1) |
| `/admin/usuarios` | Solo `admin` | Buscar usuarios y cambiar su rol o su estado (CU-19 a CU-21) |
| `/cuenta` | Solo `cliente` | Mi cuenta (inicio provisional: "Mis pedidos" llega en F3.2) |

Las rutas privadas usan `components/ProtectedRoute.jsx` (`<ProtectedRoute roles={['admin']} />`):
- mientras se valida la sesión muestra "Verificando sesión…";
- sin sesión lleva a `/login`;
- con otro rol muestra "No autorizado" en la misma URL.

Para agregar una página privada, ponla dentro del grupo de su rol en `App.jsx`.

Las demás pantallas (catálogo real, carrito real, checkout, pedidos, recuperar contraseña, secciones de los paneles) se construyen por sprints: [ROADMAP](../docs/ROADMAP.md). El backend de todas ya existe: [API_CONTRATOS](../docs/diseno-tecnico/API_CONTRATOS.md).

## Puntos clave

- Los componentes no hacen `fetch`: todo pasa por `src/services/`, y `api.js` agrega el token Bearer.
- La API responde `{ ok, data, message, code }`: los datos se leen en `respuesta.data`. Los errores llegan como `ApiError` (`message`, `status`, `code`, `data`) y se manejan por `code`.
- Proveedores globales en `App.jsx`, en este orden: Router → `ToastProvider` → `AuthProvider`. Los mensajes al usuario van con `useToast().mostrar()`, nunca con `alert()`.
- Una sola barra de navegación: `components/Navbar.jsx`. El carrito solo aparece cuando la página le pasa la prop `carrito`.
- **Sistema de diseño "Montaña Clara"** (F2.1):
  - `assets/tokens.css` es la única fuente de colores, tipografía, espacios, radios y sombras. Nunca escribas un color a mano: usa `var(--…)`.
  - `assets/base.css` trae la base global y los componentes reutilizables: `.contenedor`, `.btn` con sus variantes (`--primario`, `--suave`, `--acento`, `--peligro`, `--bloque`), `.icono-btn`, `.campo` / `.input`, `.tarjeta`, `.etiqueta--exito|aviso|error|acento`, `.alerta--error` y `.solo-lector`.
  - Cada vista tiene su `.css` con clases BEM propias: `navbar.css`, `toast.css`, `tienda.css`, `auth.css` y `panel.css`.
  - Tipografías Outfit (títulos) y Nunito Sans (texto), cargadas desde Google Fonts en `index.html`.
- Para pedir ayuda sin romper la arquitectura: [GUIA_PROMPTS_FRONTEND](../docs/guias-prompts/GUIA_PROMPTS_FRONTEND.md).

## Flujo de sesión

Login → `AuthContext` guarda `data.token` y `data.user` en `localStorage` (`bikestore_token`, `bikestore_user`) → `api.js` agrega `Authorization: Bearer` → el backend verifica el JWT y, en cada petición, el estado y el rol del usuario.

- Al abrir la app con un token guardado, `AuthContext` lo valida con `GET /auth/me` y refresca nombre y rol. Mientras tanto, `verificando` es `true`.
- Si una petición con token responde 401, o 403 con `CUENTA_DESACTIVADA`, `api.js` avisa al `AuthContext` (callback registrado con `registrarManejadorSesionInvalida`): se cierra la sesión, se muestra el mensaje y se va a `/login`.

Ocultar un botón en React no es seguridad: el backend también verifica el rol.

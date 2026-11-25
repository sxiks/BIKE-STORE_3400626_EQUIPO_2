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
| `/login`, `/registro` | Pública | Autenticación, conectada a la API |

Las demás pantallas (catálogo real, carrito real, checkout, pedidos, recuperar contraseña, paneles de admin) se construyen por sprints: [ROADMAP](../docs/ROADMAP.md). El backend de todas ya existe: [API_CONTRATOS](../docs/diseno-tecnico/API_CONTRATOS.md).

## Puntos clave

- Los componentes no hacen `fetch`: todo pasa por `src/services/`, y `api.js` agrega el token Bearer.
- La API responde `{ ok, data, message, code }`: los datos se leen en `respuesta.data` y los errores se manejan por `code`.
- Estilos: `assets/base.css` (global mínimo), `assets/lab.css` (raíz `.lab`, login y registro) y `assets/tienda.css` (raíz `.tienda`). Están aislados a propósito hasta unificar el diseño.
- Para pedir ayuda sin romper la arquitectura: [GUIA_PROMPTS_FRONTEND](../docs/guias-prompts/GUIA_PROMPTS_FRONTEND.md).

## Flujo de sesión

Login → `AuthContext` guarda `data.token` y `data.user` en `localStorage` → `api.js` agrega `Authorization: Bearer` → el backend verifica el JWT y, en cada petición, el estado y el rol del usuario.

Ocultar un botón en React no es seguridad: el backend también verifica el rol.

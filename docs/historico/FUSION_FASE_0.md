> **Documento histórico.** Describe la primera fusión (Laboratorio + Carrito) cuando el proyecto usaba MySQL.
> Después el equipo cambió a **PostgreSQL**, se aprobó el modelo de datos completo y se regeneró el backend:
> ver [MODELO_DATOS](../diseno-tecnico/MODELO_DATOS.md), [database/README](../../database/README.md) y [ROADMAP](../ROADMAP.md). El módulo `equipos` mencionado aquí ya fue retirado.
> ← Volver al [índice de la documentación](../README.md)

# Fase 0 · Registro de la fusión

Proyectos de origen:

- **Laboratorio CRUD** (Jean Cardona): backend Express + MySQL + JWT + roles + subida de imágenes; frontend React 19 con login, registro y CRUD de equipos.
- **Carrito – TIENDA PALMIRA** (Isabella Montoya, Jean Cardona): SPA React 18 con catálogo, carrito, validaciones de stock, toasts y 12 pruebas automatizadas.

Criterio: el Laboratorio es la base (ya tiene backend en capas y autenticación); el Carrito aporta su módulo de tienda al frontend. **No se agregaron funcionalidades nuevas.**

## Qué se tomó de cada proyecto

| Destino | Origen |
|---------|--------|
| `backend/**` | Laboratorio (`backend/`) |
| `database/migrations/001_base_usuarios_equipos.sql` | Laboratorio (`sql/lab_crud.sql`) |
| `frontend/` (config, login, registro, equipos, servicios, AuthContext) | Laboratorio (`frontend/`) |
| `frontend/src/context/CarritoContext.jsx`, `ToastContext.jsx` | Carrito |
| `frontend/src/components/CantidadInput, CarritoPanel, Catalogo, ProductCard, ToastContainer` | Carrito |
| `frontend/src/components/NavbarTienda.jsx` | Carrito (`Navbar.jsx`, renombrado) |
| `frontend/src/pages/TiendaPage.jsx` | Carrito (`App.jsx`, convertido en página) |
| `frontend/src/data/productos.js`, `utils/formato.js`, `test/*` | Carrito |
| `frontend/src/assets/tienda.css` | Carrito (`styles.css`) |
| `frontend/src/assets/lab.css` | Laboratorio (`styles.css`) |
| [`docs/carrito/CHECKLIST_PRUEBAS.md`](../carrito/CHECKLIST_PRUEBAS.md) | Carrito |
| `docs/requerimientos/*.pdf` | Casos de uso CU-01 a CU-22 |

**No incluido:** las capturas `evidencias/*.png` del Carrito (eran binarios y no venían en el export). Si se quieren conservar, copiarlas a `docs/carrito/evidencias/`.

## Cambios realizados (todos explícitos)

### Backend
1. **Nueva capa `repositories/`** (`usuarios.repository.js`, `equipos.repository.js`). Los servicios y `seedAdmin.js` ya no importan `config/db`: todo el SQL vive en repositorios. Mismo SQL, mismo comportamiento (verificado con pruebas de humo sobre todas las rutas).
2. `upload.middleware.js` crea `uploads/equipos/` al arrancar. Antes era un paso manual, y el `.gitignore` raíz del laboratorio impedía subir el `.gitkeep`, así que en un clon nuevo la subida de imágenes fallaba.
3. Base de datos renombrada a `bike_store` en la migración y en `.env.example`. **Corrige un error:** el SQL creaba `laboratorio_crud` pero `.env.example` apuntaba a `lab_crud`.
4. `ADMIN_EMAIL` de ejemplo → `admin@bikestore.local`.
5. Textos: nombre del paquete, mensaje de `/api/health` y log de arranque (se corrigió también `http:/localhost` → `http://localhost`).

### Frontend
6. **React 18 → 19** para el código del Carrito (el Laboratorio ya usaba 19). Las 12 pruebas pasan sin cambios de lógica.
7. Se agregaron Vitest 3, jsdom y Testing Library (Vitest 2 no es compatible con Vite 7). Script `npm test`.
8. **Rutas:** `/` ahora muestra la tienda (pública, CU-01). Antes redirigía a `/equipos`. Las rutas desconocidas van a `/`.
9. **Aislamiento de estilos.** Ambos proyectos definían `.card`, `.navbar` y `body`, y el laboratorio aplica estilos globales a `button`, `input` y `table`, que deformaban el carrito. Solución: cada hoja quedó bajo una clase raíz (`.lab` o `.tienda`) mediante un prefijo mecánico de selectores; `base.css` conserva solo `body { margin: 0 }`. Las vistas del laboratorio se envuelven con `components/LabLayout.jsx`.
10. La prueba del carrito renderiza `TiendaPage` en lugar de `App`.
11. Título de la pestaña → "Bike Store".

### Repositorio
12. Un solo `.gitignore` en la raíz (antes había 3). Ahora **sí ignora `.env`** en la raíz y **sí versiona `package-lock.json`** (antes se ignoraba).
13. Nuevos `.gitattributes` (finales de línea LF) y `.editorconfig`.

## Se mantiene a propósito (para no cambiar comportamiento en la Fase 0)

- Marca "TIENDA PALMIRA" y productos típicos en la tienda: son datos simulados que se reemplazan por el catálogo de bicicletas en el Sprint 2. La prueba 12 verifica ese texto.
- Marca "LAB CRUD" en login y registro: se rediseñan en el Sprint 1.
- Módulo `equipos`: es la referencia del CRUD con imagen para `productos`.
- Detalles menores heredados (botón "Editor", texto "Seisón", `confirm()` nativo en EquiposPage): se corrigen cuando se rehagan esas vistas.

## Verificación realizada

- `npm test` (frontend): 12/12 pruebas en verde.
- `npm run build` (frontend): compila sin errores.
- Backend contra MariaDB 10.11 con la migración 001: health, registro (201 y 409), login (200 y 401), CRUD de equipos con imagen, 401 sin token, 403 al eliminar como cliente, eliminación como admin con borrado del archivo de imagen y seed del admin.
- Revisión visual: la tienda, el panel del carrito con su toast y el login mantienen cada uno su diseño original.

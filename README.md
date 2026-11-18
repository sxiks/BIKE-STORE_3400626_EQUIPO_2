# 🚲 Bike Store

Tienda en línea de bicicletas y accesorios. Proyecto formativo (SENA · ADSO).

Monorepo con dos aplicaciones independientes y su base de datos:

| Carpeta | Qué es | Stack | Responsable |
|---------|--------|-------|-------------|
| `backend/` | API REST en capas | Node.js 20+, Express 5, PostgreSQL (`pg`), JWT, bcrypt, multer | Dev Backend |
| `frontend/` | SPA (capa de presentación) | React 19, Vite 7, React Router 7, Vitest | Dev Frontend |
| `database/` | Migraciones SQL numeradas | PostgreSQL 15+ | Dev Backend |
| `docs/` | Arquitectura, contratos de API, modelo de datos, guías, requerimientos (CU-01…CU-22) | Markdown / PDF | Ambos (vía PR) |

## Arquitectura

```
React SPA (frontend/)  ──HTTP/JSON──►  routes → middlewares → controllers → services → repositories → PostgreSQL
   Presentación                         API       Seguridad        API         Negocio     Acceso a datos
```

Detalle y reglas de cada capa: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Estado

- **Backend:** implementado para los CU-01 a CU-22 (falta la exportación de CU-18), con 78 casos verificados contra PostgreSQL.
- **Frontend:** tienda con datos simulados; login y registro conectados a la API. Las demás pantallas se construyen por sprints ([`docs/ROADMAP.md`](docs/ROADMAP.md)).

## Puesta en marcha local

Guía completa, con instalación de PostgreSQL y solución de problemas: [`docs/GUIA_DESARROLLO_LOCAL.md`](docs/GUIA_DESARROLLO_LOCAL.md).

```bash
# 1. Base de datos (una sola vez)
sudo -u postgres psql -c "CREATE ROLE bike_store_app WITH LOGIN PASSWORD 'cambia_esta_clave';"
sudo -u postgres psql -c "CREATE DATABASE bike_store OWNER bike_store_app;"
sudo -u postgres psql -c "ALTER DATABASE bike_store SET timezone TO 'America/Bogota';"
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/002_modelo_bike_store.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/003_datos_semilla.sql

# 2. Backend  → http://localhost:3000
cd backend && cp .env.example .env && npm install && npm run dev

# 3. Frontend → http://localhost:5173   (en otra terminal)
cd frontend && cp .env.example .env && npm install && npm run dev
```

Admin inicial: `admin@bikestore.local` / `CambiaEsta123` (lo crea el backend desde el `.env`).

## Cómo trabajamos

Ramas, Pull Requests y reglas anti-conflictos: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Documentación

| Documento | Para qué |
|-----------|----------|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Capas, carpetas y reglas de dependencia |
| [`docs/API_CONTRATOS.md`](docs/API_CONTRATOS.md) | Endpoints, formatos y códigos de error (fuente de verdad entre Back y Front) |
| [`docs/MODELO_DATOS.md`](docs/MODELO_DATOS.md) | MER, tablas y decisiones de diseño |
| [`database/README.md`](database/README.md) | Qué son las migraciones y cómo aplicarlas |
| [`docs/GUIA_DESARROLLO_LOCAL.md`](docs/GUIA_DESARROLLO_LOCAL.md) | Instalar, correr y probar (token de recuperación, pago simulado) |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Sprints, decisiones resueltas y pendientes, despliegue |
| [`docs/GUIA_PROMPTS_FRONTEND.md`](docs/GUIA_PROMPTS_FRONTEND.md) | Prompts para el Dev Frontend |
| [`docs/GUIA_PROMPTS_BACKEND.md`](docs/GUIA_PROMPTS_BACKEND.md) | Prompts para el Dev Backend |
| [`docs/requerimientos/`](docs/requerimientos/) | Casos de uso CU-01 a CU-22 |
| [`docs/FUSION_FASE_0.md`](docs/FUSION_FASE_0.md) | Historia: cómo se fusionaron los proyectos de origen |

# 🚲 Bike Store

Tienda en línea de bicicletas y accesorios. Proyecto formativo (SENA · ADSO).

Monorepo con dos aplicaciones independientes y su base de datos:

| Carpeta | Qué es | Stack | Responsable |
|---------|--------|-------|-------------|
| `backend/` | API REST en capas | Node.js 22.12+ (recomendado 26 LTS), Express 5, PostgreSQL (`pg`), JWT, bcrypt, multer | Dev Backend |
| `frontend/` | SPA (capa de presentación) | React 19, Vite 7, React Router 7, Vitest | Dev Frontend |
| `database/` | Migraciones SQL numeradas y arranque de la base en Docker | PostgreSQL 17 en Docker (`docker-compose.yml`); 15+ sin Docker | Dev Backend |
| `docs/` | Diseño técnico, guías, prompts, glosario y requerimientos (CU-01…CU-22) | Markdown / PDF | Ambos (vía PR) |

## Arquitectura

```
React SPA (frontend/)  ──HTTP/JSON──►  routes → middlewares → controllers → services → repositories → PostgreSQL
   Presentación                         API       Seguridad        API         Negocio     Acceso a datos
```

Detalle y reglas de cada capa: [ARQUITECTURA](docs/diseno-tecnico/ARQUITECTURA.md).

## Estado

- **Backend:** implementado para los CU-01 a CU-22 (la exportación de CU-18 está decidida y se implementa en el Sprint 4), con 78 casos verificados contra PostgreSQL. Tiene base de pruebas automatizadas (Vitest + Supertest) y el módulo de autenticación ya está cubierto.
- **Frontend:** sistema de diseño "Noche" con tema oscuro y claro, navbar con sesión, rutas `/admin` y `/cuenta` protegidas por rol, login y registro conectados a la API. El catálogo y el carrito siguen con datos simulados hasta los sprints 2 y 3 ([ROADMAP](docs/ROADMAP.md)).

## Ejecutar el proyecto en tu PC

Sigue la [GUIA_EJECUCION_LOCAL](docs/GUIA_EJECUCION_LOCAL.md): verificar e instalar requisitos (Linux y Windows), levantar la base de datos con Docker, levantar la API y la interfaz web, y comprobar que todo funciona.

Inicio rápido, si ya tienes Node.js, Git y Docker (desde la raíz del repositorio, cada servicio en su terminal):

```bash
cp .env.example .env                                   # elige POSTGRES_PASSWORD (ver la guía, paso 4)
docker compose up -d                                   # base de datos: PostgreSQL con el modelo y la semilla
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && cp .env.example .env && npm install && npm run dev    # http://localhost:5173
```

## Cómo trabajamos

Ramas, Pull Requests y reglas anti-conflictos: [CONTRIBUTING](CONTRIBUTING.md).

## Documentación

El punto de entrada es el [índice de la documentación](docs/README.md): qué leer en cada paso de una tarea y dónde buscar cuando tengas una duda. Los términos técnicos están en el [GLOSARIO](docs/GLOSARIO.md).

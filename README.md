# 🚲 Bike Store

Tienda en línea de bicicletas y accesorios. Proyecto formativo (SENA · ADSO).

Monorepo con dos aplicaciones independientes y su base de datos:

| Carpeta | Qué es | Stack | Responsable |
|---------|--------|-------|-------------|
| `backend/` | API REST en capas | Node.js 22.13+ (recomendado 26 LTS), Express 5, PostgreSQL (`pg`), JWT, bcrypt, multer | Dev Backend |
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

Los sprints 0 a 4 están terminados e integrados en `main`; solo falta el Sprint 5 · Despliegue.

- **Backend:** API para los CU-01 a CU-22 sobre PostgreSQL, incluida la exportación del informe a Excel y PDF (CU-18), cubierta con pruebas automatizadas (Vitest + Supertest).
- **Frontend:** tienda con catálogo y detalle de producto, carrito guardado en la cuenta del cliente, checkout con pago simulado, historial de pedidos y panel del administrador (usuarios, productos, categorías, pedidos y tablero con informes), con pruebas automatizadas (Vitest + Testing Library).

El detalle de cada sprint, las decisiones tomadas y lo que falta está en el [ROADMAP](docs/ROADMAP.md), que es la fuente única del estado del proyecto.

## Ejecutar el proyecto en tu PC

Sigue la [GUIA_EJECUCION_LOCAL](docs/GUIA_EJECUCION_LOCAL.md): verificar e instalar requisitos (Linux y Windows), levantar la base de datos con Docker, levantar la API y la interfaz web, y comprobar que todo funciona.

Inicio rápido, si ya tienes Node.js, Git y Docker (desde la raíz del repositorio, cada servicio en su terminal):

```bash
cp .env.example .env                                   # elige POSTGRES_PASSWORD (ver la guía, paso 4)
docker compose up -d                                   # base de datos: PostgreSQL con el modelo y la semilla
cd backend && cp .env.example .env && npm ci && npm run dev
cd frontend && cp .env.example .env && npm ci && npm run dev         # http://localhost:5173
```

## Cómo trabajamos

Ramas, Pull Requests y reglas anti-conflictos: [CONTRIBUTING](CONTRIBUTING.md).

## Documentación

El punto de entrada es el [índice de la documentación](docs/README.md): qué leer en cada paso de una tarea y dónde buscar cuando tengas una duda. Los términos técnicos están en el [GLOSARIO](docs/GLOSARIO.md).

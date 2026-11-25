# 🚲 Bike Store

Tienda en línea de bicicletas y accesorios. Proyecto formativo (SENA · ADSO).

Monorepo con dos aplicaciones independientes y su base de datos:

| Carpeta | Qué es | Stack | Responsable |
|---------|--------|-------|-------------|
| `backend/` | API REST en capas | Node.js 22+ (recomendado 24 LTS), Express 5, PostgreSQL (`pg`), JWT, bcrypt, multer | Dev Backend |
| `frontend/` | SPA (capa de presentación) | React 19, Vite 7, React Router 7, Vitest | Dev Frontend |
| `database/` | Migraciones SQL numeradas | PostgreSQL 15+ | Dev Backend |
| `docs/` | Diseño técnico, guías, prompts, glosario y requerimientos (CU-01…CU-22) | Markdown / PDF | Ambos (vía PR) |

## Arquitectura

```
React SPA (frontend/)  ──HTTP/JSON──►  routes → middlewares → controllers → services → repositories → PostgreSQL
   Presentación                         API       Seguridad        API         Negocio     Acceso a datos
```

Detalle y reglas de cada capa: [ARQUITECTURA](docs/diseno-tecnico/ARQUITECTURA.md).

## Estado

- **Backend:** implementado para los CU-01 a CU-22 (la exportación de CU-18 está decidida y se implementa en el Sprint 4), con 78 casos verificados contra PostgreSQL.
- **Frontend:** tienda con datos simulados; login y registro conectados a la API. Las demás pantallas se construyen por sprints ([ROADMAP](docs/ROADMAP.md)).

## Ejecutar el proyecto en tu PC

Sigue la [GUIA_EJECUCION_LOCAL](docs/GUIA_EJECUCION_LOCAL.md): verificar e instalar requisitos (Linux y Windows), crear la base de datos, levantar la API y la interfaz web, y comprobar que todo funciona.

## Cómo trabajamos

Ramas, Pull Requests y reglas anti-conflictos: [CONTRIBUTING](CONTRIBUTING.md).

## Documentación

El punto de entrada es el [índice de la documentación](docs/README.md): qué leer en cada paso de una tarea y dónde buscar cuando tengas una duda. Los términos técnicos están en el [GLOSARIO](docs/GLOSARIO.md).

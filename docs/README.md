# Documentación · Bike Store

> **Para qué sirve:** es el mapa de la documentación: qué leer en cada paso de una tarea y dónde buscar cuando tengas una duda.
> **Cuándo usarlo:** siempre que no sepas qué documento abrir.
> ← Volver al [README del proyecto](../README.md) · Términos desconocidos: [GLOSARIO](GLOSARIO.md)

## Cada tarea

Una tarea del sprint siempre sigue este ciclo. Cada paso enlaza al documento que lo explica.

| Paso | Qué haces | Documento |
|---|---|---|
| 0 | Tener el proyecto corriendo en tu PC (solo la primera vez, o tras un cambio de base de datos) | [GUIA_EJECUCION_LOCAL](GUIA_EJECUCION_LOCAL.md) |
| 1 | Elegir la tarea del sprint actual | [ROADMAP](ROADMAP.md#sprints) |
| 2 | Crear la rama desde `develop` actualizado | [CONTRIBUTING · ciclo diario](../CONTRIBUTING.md#4-ciclo-diario-de-una-tarea) |
| 3 | Pedirle a la IA la implementación con el prompt de la tarea | [Prompts Frontend](guias-prompts/GUIA_PROMPTS_FRONTEND.md) · [Prompts Backend](guias-prompts/GUIA_PROMPTS_BACKEND.md) |
| 4 | Revisar los endpoints y sus errores | [API_CONTRATOS](diseno-tecnico/API_CONTRATOS.md) |
| 5 | Respetar las capas al escribir código | [ARQUITECTURA](diseno-tecnico/ARQUITECTURA.md#2-regla-de-dependencia-obligatoria) |
| 6 | Probar a mano el flujo completo | [GUIA_PRUEBAS_LOCALES](GUIA_PRUEBAS_LOCALES.md) |
| 7 | Subir la rama y abrir el PR | [CONTRIBUTING · Pull Requests](../CONTRIBUTING.md#5-pull-requests) |
| 8 | Al cerrar el sprint, integrar `develop` en `main` | [CONTRIBUTING · cierre de sprint](../CONTRIBUTING.md#8-cierre-de-sprint) |

## Cuando tengas una duda

| Si tu duda es… | Ve a |
|---|---|
| Qué significa un término (rama, PR, middleware, trigger…) | [GLOSARIO](GLOSARIO.md) |
| Algo no arranca o da error al ejecutar | [GUIA_PRUEBAS_LOCALES · problemas frecuentes](GUIA_PRUEBAS_LOCALES.md#4-problemas-frecuentes) |
| Qué responde un endpoint o qué significa un `code` de error | [API_CONTRATOS](diseno-tecnico/API_CONTRATOS.md) |
| En qué carpeta va un archivo o qué puede importar | [ARQUITECTURA](diseno-tecnico/ARQUITECTURA.md) |
| Qué tabla o columna guarda un dato | [MODELO_DATOS](diseno-tecnico/MODELO_DATOS.md) |
| Por qué el modelo de datos es como es | [JUSTIFICACION_MODELO_DATOS](diseno-tecnico/JUSTIFICACION_MODELO_DATOS.md) |
| Qué es una migración o cómo agregar una | [database/README](../database/README.md) |
| Por qué algo funciona así (una decisión ya tomada) | [ROADMAP · decisiones](ROADMAP.md#decisiones) |
| Cómo nombrar la rama o escribir el commit | [CONTRIBUTING](../CONTRIBUTING.md) |
| Qué dice el requerimiento original de un CU | [requerimientos/](requerimientos/) |
| Cómo probar el carrito heredado del proyecto de origen | [carrito/CHECKLIST_PRUEBAS](carrito/CHECKLIST_PRUEBAS.md) |
| De dónde salió el proyecto (fusión inicial) | [historico/FUSION_FASE_0](historico/FUSION_FASE_0.md) |

## Estructura de `docs/`

| Carpeta o archivo | Contenido |
|---|---|
| [GLOSARIO.md](GLOSARIO.md) | Términos técnicos del proyecto |
| [GUIA_EJECUCION_LOCAL.md](GUIA_EJECUCION_LOCAL.md) | Instalar requisitos y ejecutar el proyecto (Linux y Windows) |
| [GUIA_PRUEBAS_LOCALES.md](GUIA_PRUEBAS_LOCALES.md) | Probar flujos a mano y resolver problemas frecuentes |
| [ROADMAP.md](ROADMAP.md) | Sprints, tareas y decisiones |
| [diseno-tecnico/](diseno-tecnico/) | [ARQUITECTURA](diseno-tecnico/ARQUITECTURA.md), [API_CONTRATOS](diseno-tecnico/API_CONTRATOS.md), [MODELO_DATOS](diseno-tecnico/MODELO_DATOS.md), [JUSTIFICACION_MODELO_DATOS](diseno-tecnico/JUSTIFICACION_MODELO_DATOS.md) |
| [guias-prompts/](guias-prompts/) | [Prompts Frontend](guias-prompts/GUIA_PROMPTS_FRONTEND.md) y [Prompts Backend](guias-prompts/GUIA_PROMPTS_BACKEND.md) |
| [requerimientos/](requerimientos/) | Casos de uso CU-01 a CU-22 (PDF) |
| [carrito/](carrito/) | Checklist de pruebas del carrito de origen |
| [historico/](historico/) | Documentos de fases cerradas |

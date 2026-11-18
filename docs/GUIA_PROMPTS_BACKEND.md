# Guía de Consultas Rápidas para el Backend

Prompts para el Dev Backend. Se copian, se completa lo que está entre `[corchetes]` y se envían al asistente. Cada uno trae las reglas de la arquitectura en capas y de PostgreSQL para que las respuestas no las rompan.

**Siempre:** empieza cada chat nuevo con el prompt 0 y adjunta los archivos que menciona.

---

## 0 · Contexto inicial (pegar al abrir un chat nuevo)

```
Soy el Dev Backend de Bike Store (SENA). Backend: Node 20, Express 5, PostgreSQL 15+ con driver pg, JWT + bcrypt, multer. Arquitectura en capas:
routes -> middlewares -> controllers -> services -> repositories -> PostgreSQL.
Reglas que debes respetar:
- Solo repositories/ importa config/db. Cada función de repositorio recibe como último parámetro opcional `db` (pool por defecto o el cliente de una transacción).
- SQL siempre parametrizado con $1, $2...; ids con RETURNING; ORDER BY solo desde una lista cerrada. Comparaciones de correo y nombres únicos con lower(col) = lower($1).
- Transacciones con withTransaction de repositories/transaction.js, llamadas desde services.
- services: reglas y validaciones con utils/validators.js; errores con AppError(message, status, code?, data?). Sin req/res ni SQL.
- controllers: async, sin try/catch (Express 5 propaga), pasan req.body ?? {} y responden con utils/respuesta.ok().
- Respuestas: { ok: true, data, message? } / { ok: false, message, code?, data? }.
- middlewares: authenticate (JWT + estado/rol en BD en cada petición), authorize(...roles), uploadProductoImagen, errorHandler (nunca registra req.body).
- pg devuelve NUMERIC e INT8 como Number (config/db.js); TIMESTAMPTZ como Date; zona horaria America/Bogota.
- Cambios de esquema = migración nueva database/migrations/00N_*.sql (nunca editar una ya integrada).
- Solo trabajo en backend/, database/ y docs/API_CONTRATOS.md. El frontend es de mi compañero.
Adjunto: docs/ARQUITECTURA.md, docs/API_CONTRATOS.md, docs/MODELO_DATOS.md y los archivos que voy a tocar.
Entrega por pasos: primero el análisis y la lista de archivos a crear o modificar; espera mi aprobación antes de escribir código.
```

## 1 · Nuevo endpoint (contrato primero)

```
Necesito el endpoint [MÉTODO /ruta] para [CU-XX / RF-XX]. Rol: [pública | cliente | admin].
Qué hace: [descripción]. Reglas de negocio: [lista].
Paso 1: redacta el bloque para docs/API_CONTRATOS.md con la plantilla del final del documento (request, respuestas, codes).
Paso 2 (tras mi aprobación): implementa route -> controller -> service -> repository siguiendo los módulos existentes como ejemplo [adjunto el módulo más parecido].
Indica qué archivos cambian y cómo probarlo con curl.
```

## 2 · Consulta SQL / repositorio

```
Necesito una función de repositorio en repositories/[modulo].repository.js que [descripción del dato que necesito].
Tablas involucradas: [tablas] (modelo en docs/MODELO_DATOS.md y 002_modelo_bike_store.sql adjuntos).
Requisitos: parámetros $n, filtros opcionales armados con un arreglo de condiciones (como usuarios.repository.buscar), parámetro opcional `db`, y qué índice existente usa (o si conviene uno nuevo vía migración).
Explica la consulta línea por línea en 3-5 frases.
```

## 3 · Regla de negocio en un servicio

```
En services/[modulo].services.js necesito aplicar la regla: [regla, ej. "un cliente no puede tener más de 3 pedidos pendientes"].
Archivos actuales: [adjunta el servicio y su repositorio].
Indica: dónde va la validación, qué AppError (status y code) lanza, si necesita una transacción o un bloqueo (FOR UPDATE), y qué fila de la tabla de codes de API_CONTRATOS.md hay que agregar.
```

## 4 · Transacción y concurrencia

```
Esta operación toca varias tablas: [describe los pasos].
Diseña el flujo con withTransaction: qué filas bloquear (FOR UPDATE) y en qué orden para evitar deadlocks, qué validar antes de escribir, y qué pasa si falla cada paso (ROLLBACK, qué responde la API).
Toma como referencia pedidos.services.pagar (adjunto).
```

## 5 · Migración nueva

```
Necesito cambiar el esquema: [ej. agregar columna `marca` a productos / nueva tabla X].
Esquema actual: database/migrations/002_modelo_bike_store.sql (adjunto).
Genera database/migrations/00[N]_[descripcion].sql para PostgreSQL 15+: envuelto en BEGIN/COMMIT, con constraints con nombre (ck_/fk_/uq_/ix_), valores por defecto seguros para filas existentes, y comentarios con el CU.
Lista los repositorios, servicios y contratos que cambian y el texto "Requiere aplicar la migración 00N" para el PR.
```

## 6 · Pruebas automatizadas de la API

```
Quiero pruebas automatizadas para el módulo [modulo] con Vitest + Supertest contra una base PostgreSQL de pruebas (bike_store_test).
Propón: la configuración (variables .env.test, cómo crear y migrar la base de pruebas antes de correr, limpieza entre pruebas), los scripts de package.json y los casos: [lista, ej. registro OK, correo duplicado 409, D7].
No cambies el comportamiento de la API.
```

## 7 · Error 500 o comportamiento inesperado

```
Al llamar [MÉTODO /ruta] con [body] obtengo [status y respuesta]. En la consola del backend aparece:
[pega el error y el stack]
Archivos involucrados: [adjunta route, controller, service y repository].
Encuentra la causa, explica por qué ocurre y propón la corrección mínima. Si el error es de PostgreSQL, di su código SQLSTATE y si el servicio debería traducirlo a un AppError con code.
```

## 8 · Seguridad de un endpoint

```
Revisa la seguridad de [ruta / módulo] (archivos adjuntos):
autenticación y rol correctos, que un usuario no pueda leer ni modificar datos de otro (comparar id_usuario), validación de cada entrada, SQL parametrizado, que no se filtren datos sensibles (password, tokens, números de pago) en respuestas ni logs, y límites (tamaño de archivos, paginación).
Devuélveme los hallazgos ordenados por gravedad con la corrección mínima de cada uno.
```

## 9 · Exportación del tablero (CU-18, cuando se decida D11)

```
Implementa GET /dashboard/exportar?formato=xlsx|pdf&desde=&hasta=&categoria= (admin) para CU-18.
Reusa dashboard.services.metricas (adjunto). Propón la librería (exceljs para Excel, pdfkit para PDF), dónde genera el archivo (en memoria, sin guardarlo en disco), los encabezados de descarga (Content-Type, Content-Disposition) y el contrato para API_CONTRATOS.md.
```

## 10 · Conflicto de merge

```
Al hacer git merge origin/develop en mi rama feature/back-[modulo] tengo conflicto en [archivo].
Pego el bloque con las marcas <<<<<<< ======= >>>>>>>:
[bloque]
Explícame qué trae cada lado y propón la versión final que conserve ambos cambios. Si el conflicto es en package-lock.json, dame los comandos para regenerarlo. Sin --force.
```

## 11 · Revisión antes de abrir el PR

```
Revisa este diff antes de abrir el PR hacia develop:
[pega git diff origin/develop...HEAD -- backend/ database/ docs/API_CONTRATOS.md]
Verifica: regla de capas (corre mentalmente los 3 grep de ARQUITECTURA.md §2), SQL parametrizado, errores con AppError y code, contrato actualizado, migración nueva en lugar de editar una existente, variables nuevas en .env.example, sin console.log de depuración ni datos sensibles en logs.
Devuélveme una lista corta de problemas y un título + descripción para el PR según .github/pull_request_template.md.
```

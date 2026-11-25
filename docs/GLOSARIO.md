# Glosario · Bike Store

> **Para qué sirve:** explica en una o dos líneas cada término técnico que aparece en la documentación del proyecto.
> **Cuándo usarlo:** cuando un documento enlace aquí o encuentres una palabra que no conoces.
> ← Volver al [índice de la documentación](README.md)

Los términos están agrupados por tema. Cada uno tiene un enlace propio, para que los demás documentos apunten directo a él.

**Temas:** [Git y GitHub](#git-y-github) · [Arquitectura y backend](#arquitectura-y-backend) · [Base de datos](#base-de-datos) · [Frontend](#frontend) · [Proyecto y documentación](#proyecto-y-documentación)

---

## Git y GitHub

- <a name="git"></a>**Git:** programa que guarda el historial de cambios del código y permite que varias personas trabajen sobre el mismo proyecto.
- <a name="github"></a>**GitHub:** servicio web donde se aloja el repositorio remoto del proyecto, se revisan los cambios y se aprueban los Pull Requests.
- <a name="repositorio-git"></a>**Repositorio (Git):** la carpeta del proyecto junto con todo su historial, guardado en la carpeta oculta `.git`. No confundir con [repositorio (capa)](#repositorio-capa).
- <a name="clonar"></a>**Clonar (`git clone`):** descargar una copia completa del repositorio remoto a tu PC.
- <a name="origin"></a>**`origin`:** nombre que Git le da al repositorio remoto (el de GitHub) dentro de tu copia local.
- <a name="commit"></a>**Commit:** una "foto" guardada de los cambios, con un mensaje que explica qué se hizo.
- <a name="conventional-commits"></a>**Conventional Commits:** formato de mensaje de commit `tipo(ámbito): descripción`, por ejemplo `feat(carrito): sumar cantidades`. Ver la [sección 7 de CONTRIBUTING](../CONTRIBUTING.md#7-mensajes-de-commit-conventional-commits).
- <a name="rama"></a>**Rama (branch):** una línea de trabajo independiente. Permite cambiar código sin afectar a las demás ramas hasta que se integra.
- <a name="main"></a>**`main`:** rama con la versión estable del proyecto. Solo recibe cambios al cerrar un sprint.
- <a name="develop"></a>**`develop`:** rama de integración y rama por defecto. Todo el trabajo terminado llega aquí por Pull Request.
- <a name="rama-feature"></a>**Rama de trabajo (`feature/…`, `docs/…`, `fix/…`):** rama corta, creada desde `develop` para una sola tarea, que se borra después del merge.
- <a name="gitflow"></a>**Gitflow simplificado:** la estrategia de ramas del proyecto: `main` ← `develop` ← ramas de trabajo. Ver [CONTRIBUTING](../CONTRIBUTING.md).
- <a name="push"></a>**Push (`git push`):** enviar tus commits locales a GitHub.
- <a name="pull"></a>**Pull (`git pull`):** traer a tu PC los cambios que otros subieron a GitHub.
- <a name="fetch-git"></a>**Fetch (`git fetch`):** consultar qué cambió en GitHub sin modificar tus archivos.
- <a name="merge"></a>**Merge:** unir los cambios de una rama con otra.
- <a name="conflicto"></a>**Conflicto de merge:** ocurre cuando dos ramas cambiaron las mismas líneas y Git no sabe cuál conservar. Se resuelve a mano editando las marcas `<<<<<<<`, `=======` y `>>>>>>>`.
- <a name="pr"></a>**Pull Request (PR):** solicitud en GitHub para integrar una rama en otra. Muestra los cambios y permite revisarlos y aprobarlos antes del merge.
- <a name="aprobacion"></a>**Aprobación (review):** el visto bueno del otro integrante a un PR. En este proyecto se exige 1 y nadie aprueba su propio PR.
- <a name="squash"></a>**Squash and merge:** forma de cerrar un PR que junta todos sus commits en uno solo dentro de `develop`, para mantener el historial limpio.
- <a name="merge-commit"></a>**Merge commit:** forma de cerrar un PR que conserva todos los commits y agrega uno de unión. Se usa al pasar `develop` → `main`.
- <a name="force-push"></a>**Force push (`git push --force`):** sobrescribir la historia del repositorio remoto. Está bloqueado en `main` y `develop` porque puede borrar trabajo ajeno.
- <a name="proteccion-rama"></a>**Protección de rama:** regla de GitHub que impide empujar directo, hacer force push o borrar una rama, y exige PR con aprobación.
- <a name="tag"></a>**Tag (etiqueta):** nombre fijo para un commit concreto, por ejemplo `v0.1.0` al cerrar el Sprint 1.
- <a name="head"></a>**HEAD:** el commit en el que estás parado ahora mismo. `origin/HEAD` indica la rama por defecto del remoto.
- <a name="working-tree"></a>**Working tree limpio:** no hay cambios pendientes de commit (`nothing to commit, working tree clean`).
- <a name="gitignore"></a>**`.gitignore`:** lista de archivos que Git no debe subir nunca, como `node_modules/` o `.env`.
- <a name="ssh"></a>**SSH:** forma segura de conectarse a GitHub con una llave criptográfica en lugar de usuario y contraseña.
- <a name="colaborador"></a>**Colaborador:** persona invitada al repositorio con permiso para crear ramas y aprobar PRs.

## Arquitectura y backend

- <a name="arquitectura-capas"></a>**Arquitectura en capas:** organización del código en niveles con una responsabilidad cada uno (presentación, API, negocio, acceso a datos, base de datos). Ver [ARQUITECTURA](diseno-tecnico/ARQUITECTURA.md).
- <a name="regla-dependencia"></a>**Regla de dependencia:** cada capa solo puede usar a la capa inmediatamente inferior. Ver la [sección 2 de ARQUITECTURA](diseno-tecnico/ARQUITECTURA.md#2-regla-de-dependencia-obligatoria).
- <a name="monorepo"></a>**Monorepo:** un solo repositorio que contiene varias aplicaciones, en este caso `backend/` y `frontend/`.
- <a name="api"></a>**API:** el "punto de entrada" del backend: las URLs a las que el frontend envía peticiones para leer o modificar datos.
- <a name="rest"></a>**REST:** estilo de API que usa URLs para los recursos (`/api/productos`) y verbos HTTP para la acción: `GET` lee, `POST` crea, `PUT`/`PATCH` modifica y `DELETE` borra.
- <a name="endpoint"></a>**Endpoint:** una ruta concreta de la API, por ejemplo `POST /api/auth/login`.
- <a name="json"></a>**JSON:** formato de texto con el que viajan los datos entre frontend y backend, por ejemplo `{ "ok": true, "data": {...} }`.
- <a name="status-http"></a>**Código de estado HTTP:** número que indica el resultado de una petición: 200 OK, 201 creado, 400 datos inválidos, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto, 500 error interno.
- <a name="code-error"></a>**`code` (código de error):** texto fijo que acompaña un error de la API, como `STOCK_MAXIMO`, para que el frontend reaccione sin comparar mensajes. Ver la tabla en [API_CONTRATOS](diseno-tecnico/API_CONTRATOS.md#formato-de-respuesta).
- <a name="contrato-api"></a>**Contrato de API:** el acuerdo escrito de cómo es cada endpoint (qué recibe, qué responde). Se escribe antes que el código. Ver [API_CONTRATOS](diseno-tecnico/API_CONTRATOS.md).
- <a name="express"></a>**Express:** framework de Node.js con el que está construida la API.
- <a name="nodejs"></a>**Node.js:** entorno que permite ejecutar JavaScript fuera del navegador. En él corren el backend y las herramientas del frontend.
- <a name="npm"></a>**npm:** gestor de paquetes de Node.js. `npm install` descarga las dependencias y `npm run dev` arranca el proyecto.
- <a name="dependencia"></a>**Dependencia (paquete):** librería externa que usa el proyecto, como `express` o `react`. Se declara en `package.json`.
- <a name="lockfile"></a>**`package-lock.json`:** archivo que fija la versión exacta de cada dependencia, para que los dos PCs instalen lo mismo.
- <a name="ruta"></a>**Ruta (route):** archivo del backend que asocia una URL y un verbo con su controlador y sus middlewares.
- <a name="middleware"></a>**Middleware:** función que se ejecuta antes del controlador. En el proyecto: verificar la sesión (`authenticate`), verificar el rol (`authorize`), recibir imágenes (`upload`) y manejar errores.
- <a name="controlador"></a>**Controlador:** traduce la petición HTTP en una llamada a un servicio y devuelve la respuesta. No contiene reglas de negocio.
- <a name="servicio"></a>**Servicio (capa de negocio):** donde viven las reglas: validaciones, cálculos, permisos y transacciones. No conoce SQL ni HTTP.
- <a name="repositorio-capa"></a>**Repositorio (capa de acceso a datos):** archivo que contiene el SQL de una tabla. Es el único que habla con la base de datos. No confundir con [repositorio Git](#repositorio-git).
- <a name="apperror"></a>**AppError:** clase de error del proyecto que lleva mensaje, código HTTP y `code` opcional. Los servicios la lanzan y el manejador de errores la convierte en respuesta.
- <a name="autenticacion"></a>**Autenticación:** comprobar **quién** eres (iniciar sesión).
- <a name="autorizacion"></a>**Autorización:** comprobar **qué puedes hacer** según tu rol (admin o cliente).
- <a name="jwt"></a>**JWT (JSON Web Token):** "pase" firmado que entrega el login. El frontend lo envía en cada petición (`Authorization: Bearer <token>`) para demostrar la sesión.
- <a name="bcrypt"></a>**bcrypt:** algoritmo para guardar contraseñas como un hash irreversible. Nunca se guarda la contraseña real.
- <a name="hash"></a>**Hash:** resultado de pasar un texto por una función que no se puede revertir. Sirve para comparar sin guardar el original.
- <a name="sha256"></a>**SHA-256:** función de hash que se usa para guardar los tokens de recuperación de contraseña.
- <a name="token-recuperacion"></a>**Token de recuperación:** código de un solo uso que vence en 30 minutos y permite fijar una contraseña nueva. Ver la [guía de pruebas locales](GUIA_PRUEBAS_LOCALES.md#1-recuperación-de-contraseña-cu-11).
- <a name="cors"></a>**CORS:** regla del navegador que solo permite al frontend llamar a la API si el backend autoriza su origen (`CORS_ORIGIN`).
- <a name="env"></a>**Variables de entorno (`.env`):** configuración privada de cada PC (contraseñas, secretos). Se copia desde `.env.example` y **nunca** se sube a GitHub.
- <a name="multer"></a>**multer:** librería que recibe archivos (imágenes de productos) en peticiones `multipart/form-data`.
- <a name="multipart"></a>**multipart/form-data:** formato de petición que permite enviar archivos junto con campos de texto.
- <a name="sqlstate"></a>**SQLSTATE:** código de error estándar de PostgreSQL, por ejemplo 23505 = valor duplicado o 23503 = viola una llave foránea.
- <a name="pago-simulado"></a>**Pago simulado:** el sistema no cobra de verdad. Valida los datos y decide aprobado o rechazado con una regla fija. Ver la [guía de pruebas locales](GUIA_PRUEBAS_LOCALES.md#2-pago-simulado-cu-08).
- <a name="supertest"></a>**Supertest:** librería para probar la API haciendo peticiones HTTP desde las pruebas automatizadas.

## Base de datos

- <a name="postgresql"></a>**PostgreSQL:** el motor de base de datos relacional del proyecto (versión 15 o superior).
- <a name="psql"></a>**`psql`:** cliente de terminal de PostgreSQL para ejecutar SQL y aplicar migraciones.
- <a name="base-pruebas"></a>**Base de datos de pruebas:** base separada (`bike_store_test`) que usan las pruebas automatizadas del backend. Se vacía y se recrea con `npm run test:db`; por eso su nombre debe terminar en `_test` y nunca es la base de desarrollo. Ver [backend/README](../backend/README.md#pruebas-automatizadas).
- <a name="rol-postgres"></a>**Rol de PostgreSQL:** usuario de la base de datos. La API se conecta con `bike_store_app`, no con el superusuario `postgres`.
- <a name="sql-parametrizado"></a>**SQL parametrizado:** consultas con marcadores `$1, $2…` en lugar de pegar texto del usuario. Evita la inyección SQL.
- <a name="migracion"></a>**Migración:** archivo SQL numerado con un cambio del esquema (`002_…`, `003_…`). Nunca se edita una ya aplicada. Ver [database/README](../database/README.md).
- <a name="semilla"></a>**Semilla (seed):** datos de ejemplo que se cargan para probar, como categorías y productos (`003_datos_semilla.sql`).
- <a name="ddl"></a>**DDL:** instrucciones SQL que crean o cambian la estructura (`CREATE TABLE`, `ALTER TABLE`).
- <a name="mer"></a>**MER (Modelo Entidad-Relación):** diagrama conceptual con entidades, relaciones y atributos. Ver [MODELO_DATOS](diseno-tecnico/MODELO_DATOS.md).
- <a name="mr"></a>**MR (Modelo Relacional):** el MER convertido en tablas, columnas y llaves.
- <a name="entidad-asociativa"></a>**Entidad asociativa:** entidad que resuelve una relación muchos a muchos y guarda datos propios de esa relación (`carrito_items`, `detalle_pedido`).
- <a name="cardinalidad"></a>**Cardinalidad:** cuántos elementos de una entidad se relacionan con otra: 1:1, 1:N o N:M.
- <a name="atributo-derivado"></a>**Atributo derivado:** dato que se calcula en lugar de guardarse, como el total del pedido.
- <a name="atributo-compuesto"></a>**Atributo compuesto:** dato formado por partes, como la dirección de envío (nombre, teléfono, departamento, ciudad, dirección).
- <a name="normalizacion"></a>**Normalización (3FN):** reglas para no repetir datos y evitar inconsistencias, por ejemplo tener las categorías en su propia tabla.
- <a name="pk"></a>**PK (llave primaria):** columna que identifica cada fila de forma única (`id_producto`).
- <a name="fk"></a>**FK (llave foránea):** columna que apunta a la PK de otra tabla y crea la relación (`productos.id_categoria`).
- <a name="identity"></a>**IDENTITY:** la base genera automáticamente el número de la PK (1, 2, 3…).
- <a name="not-null"></a>**NOT NULL:** la columna es obligatoria.
- <a name="unique"></a>**UNIQUE:** el valor no se puede repetir en la tabla.
- <a name="check"></a>**CHECK:** regla de validación en la base, por ejemplo `precio > 0`.
- <a name="cascade-restrict"></a>**ON DELETE CASCADE / RESTRICT:** qué pasa con las filas hijas al borrar la fila padre. CASCADE las borra también; RESTRICT impide el borrado.
- <a name="enum"></a>**ENUM:** tipo de dato con una lista cerrada de valores, como `'activo'` o `'inactivo'`.
- <a name="indice"></a>**Índice:** estructura que acelera las búsquedas, como el índice de un libro.
- <a name="trigger"></a>**Trigger:** código que la base ejecuta sola ante un evento. Por ejemplo, asignar el número de pedido al insertarlo.
- <a name="transaccion"></a>**Transacción:** grupo de operaciones que se aplican todas o ninguna (`BEGIN` … `COMMIT` / `ROLLBACK`).
- <a name="for-update"></a>**`FOR UPDATE`:** bloquea las filas leídas dentro de una transacción para que nadie las modifique al mismo tiempo, por ejemplo el stock al pagar.
- <a name="deadlock"></a>**Deadlock:** dos transacciones que se esperan mutuamente. Se evita bloqueando las filas siempre en el mismo orden.
- <a name="borrado-logico"></a>**Borrado lógico:** en lugar de borrar una fila, se marca como `inactivo`. Así se conserva la historia.
- <a name="timestamptz"></a>**TIMESTAMPTZ:** fecha y hora con zona horaria.
- <a name="numeric"></a>**NUMERIC:** número decimal exacto. Se usa para dinero porque no tiene errores de redondeo.

## Frontend

- <a name="spa"></a>**SPA (Single Page Application):** aplicación web que carga una vez y cambia de pantalla sin recargar la página.
- <a name="react"></a>**React:** librería con la que se construye la interfaz a partir de componentes.
- <a name="vite"></a>**Vite:** herramienta que arranca el frontend en desarrollo (`npm run dev`) y genera la versión de producción (`npm run build`).
- <a name="componente"></a>**Componente:** pieza reutilizable de la interfaz, como una tarjeta de producto. Recibe datos por *props*.
- <a name="props"></a>**Props:** datos que un componente recibe de quien lo usa.
- <a name="pagina"></a>**Página (page):** componente que representa una pantalla completa asociada a una ruta, como `/login`.
- <a name="contexto"></a>**Contexto (React Context):** estado compartido por muchos componentes, como la sesión (`AuthContext`) o el carrito (`CarritoContext`).
- <a name="hook"></a>**Hook:** función de React que empieza con `use`, como `useState` o `useAuth`.
- <a name="react-router"></a>**React Router:** librería que asocia cada URL del frontend con una página.
- <a name="ruta-protegida"></a>**Ruta protegida:** página que solo se muestra con sesión iniciada o con un rol concreto, mediante `<ProtectedRoute roles={['admin']} />`. Sin sesión lleva a `/login` y con otro rol muestra "No autorizado". No reemplaza la seguridad del backend.
- <a name="apierror"></a>**ApiError:** error que lanza `services/api.js` cuando la API responde con fallo. Trae `message`, `status` (código HTTP), `code` y `data`, para que cada pantalla reaccione según el `code`.
- <a name="fetch"></a>**fetch:** función del navegador para hacer peticiones HTTP. En el proyecto solo se usa dentro de `services/api.js`.
- <a name="localstorage"></a>**localStorage:** almacenamiento del navegador donde el frontend guarda la sesión.
- <a name="toast"></a>**Toast:** mensaje emergente breve en una esquina de la pantalla (éxito, error o aviso).
- <a name="mock"></a>**Mock (datos simulados):** datos falsos con la misma forma que la API real, para trabajar sin backend.
- <a name="vitest"></a>**Vitest / Testing Library:** herramientas para escribir y ejecutar pruebas automatizadas (`npm test`).
- <a name="build"></a>**Build:** la versión optimizada del frontend lista para publicar, en la carpeta `dist/`.
- <a name="sistema-diseno"></a>**Sistema de diseño:** conjunto de reglas visuales y piezas reutilizables que comparten todas las pantallas. El del proyecto se llama "Montaña Clara" y vive en `assets/tokens.css` y `assets/base.css`.
- <a name="tokens-diseno"></a>**Tokens de diseño:** variables CSS con nombre (`--color-primario`, `--espacio-4`, `--radio-md`…) que guardan los valores del sistema de diseño. Se usan con `var(--nombre)` en lugar de escribir el valor a mano.
- <a name="bem"></a>**BEM (Bloque, Elemento, Modificador):** forma de nombrar clases CSS: `bloque__elemento--modificador`, por ejemplo `producto__stock--agotado`. Evita que los estilos de una pantalla afecten a otra.
- <a name="contraste-aa"></a>**Contraste AA:** nivel mínimo de accesibilidad entre el color del texto y el del fondo (4.5:1 en texto normal), para que se lea bien.

## Proyecto y documentación

- <a name="sprint"></a>**Sprint:** periodo de trabajo con un conjunto de funcionalidades a entregar. Ver [ROADMAP](ROADMAP.md).
- <a name="cu"></a>**CU (caso de uso):** descripción de una interacción del usuario con el sistema (CU-01 a CU-22). Están en [requerimientos](requerimientos/).
- <a name="rf-rnf"></a>**RF / RNF:** requerimiento funcional (qué hace el sistema) y no funcional (cómo debe comportarse: seguridad, rendimiento…).
- <a name="dev-back-front"></a>**Dev Backend / Dev Frontend:** los dos roles del equipo. Cada uno es dueño de sus carpetas. Ver la [sección 2 de CONTRIBUTING](../CONTRIBUTING.md#2-propiedad-de-carpetas-la-regla-que-más-conflictos-evita).
- <a name="deuda-tecnica"></a>**Deuda técnica:** algo que funciona pero conviene mejorar más adelante.
- <a name="seccion"></a>**§:** símbolo que significa "sección". "§2" es "sección 2". La documentación usa enlaces con texto en su lugar.

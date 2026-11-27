# Guía de ejecución local · Bike Store

> **Para qué sirve:** dejar el proyecto corriendo en tu PC, desde verificar los requisitos hasta ver la tienda en el navegador.
> **Cuándo usarla:** al montar el entorno por primera vez, al cambiar de PC o si necesitas empezar de cero.
> ← Volver al [índice de la documentación](README.md) · Términos desconocidos: [GLOSARIO](GLOSARIO.md)

Cuando el proyecto ya esté corriendo, la [guía de pruebas locales](GUIA_PRUEBAS_LOCALES.md) explica cómo probar los flujos que todavía no tienen pantalla: recuperación de contraseña, pago simulado y compra completa.

## Quién hace cada paso

Los **dos** integrantes necesitan la base de datos y la API corriendo en su PC, aunque solo el [Dev Backend](GLOSARIO.md#dev-back-front) modifica `backend/` y `database/`.

| Paso | Dev Backend | Dev Frontend |
|---|---|---|
| [1. Verificar los requisitos](#1-verificar-los-requisitos) | ✅ | ✅ |
| [2. Instalar lo que falte](#2-instalar-lo-que-falte) | Solo si falta algo | Solo si falta algo |
| [3. Obtener el código](#3-obtener-el-código) | Ya lo tiene | ✅ |
| [4. Levantar la base de datos con Docker](#4-levantar-la-base-de-datos-con-docker) | ✅ | ✅ |
| [5. Comprobar la base de datos](#5-comprobar-la-base-de-datos) | ✅ | ✅ |
| [6. Levantar la API (backend Express)](#6-levantar-la-api-backend-express) | ✅ | ✅ |
| [7. Levantar la interfaz web (frontend React + Vite)](#7-levantar-la-interfaz-web-frontend-react--vite) | Opcional | ✅ |
| [8. Comprobar que todo funciona](#8-comprobar-que-todo-funciona) | ✅ | ✅ |

En Windows, los comandos de esta guía se ejecutan en **PowerShell**. En Linux, en la terminal (bash).

La base de datos corre en [Docker](GLOSARIO.md#docker) (decisión D13 del [ROADMAP](ROADMAP.md#resueltas)): no hace falta instalar PostgreSQL, crear el rol ni aplicar las migraciones a mano. Si en tu PC no se puede instalar Docker, usa el [anexo: alternativa sin Docker](#anexo-alternativa-sin-docker) en lugar de los pasos 4 y 5.

---

## 1. Verificar los requisitos

**Quién:** Dev Backend y Dev Frontend.

| Herramienta | Versión mínima | Recomendada |
|---|---|---|
| [Node.js](GLOSARIO.md#nodejs) (incluye [npm](GLOSARIO.md#npm)) | **22.12** | **26 LTS** |
| [Git](GLOSARIO.md#git) | cualquier versión reciente | — |
| [Docker](GLOSARIO.md#docker) con [Docker Compose](GLOSARIO.md#docker-compose) | Docker Engine 24 o Docker Desktop 4.x, con `docker compose` (v2) | La última versión estable |

> El mínimo es 22.12 porque lo exige Vitest 5, la herramienta de pruebas; además, Node.js 20 dejó de recibir parches de seguridad el 30 de abril de 2026. Si ya tienes Node 24, sigue funcionando y no hace falta cambiarlo.

**Linux**
```bash
node -v                    # v22.12 o superior (ideal v26.x)
npm -v
git --version
docker --version
docker compose version     # debe responder "Docker Compose version v2..."
docker run --rm hello-world    # comprueba que Docker funciona sin sudo
```

**Windows (PowerShell)**
```powershell
node -v
npm -v
git --version
docker --version
docker compose version
docker run --rm hello-world    # Docker Desktop debe estar abierto
```

**Cómo leer el resultado:**
- Si **todo** cumple, salta al [paso 3](#3-obtener-el-código).
- Si un comando responde `command not found`, `no se reconoce como nombre de un cmdlet` o una versión menor a la mínima, instala o actualiza esa herramienta en el [paso 2](#2-instalar-lo-que-falte).

---

## 2. Instalar lo que falte

**Quién:** cada integrante, solo para las herramientas que no pasaron el [paso 1](#1-verificar-los-requisitos). Después de instalar, **cierra y vuelve a abrir la terminal** y repite el paso 1.

### 2.1 Linux (Debian / Ubuntu)

**Git**
```bash
sudo apt update
sudo apt install -y git
```

**Node.js 26 LTS.** Los repositorios de Debian y Ubuntu traen versiones viejas (Debian 13 trae la 20), así que se instala desde NodeSource:
```bash
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_26.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt install -y nodejs
node -v      # v26.x
```

**Docker Engine.** En **Debian 13** basta con los paquetes de la distribución, que traen Docker 26 y Compose 2:
```bash
sudo apt install -y docker.io docker-compose
```
Si prefieres la versión más reciente, o tu distribución trae una sin `docker compose`, usa el repositorio oficial de Docker:
```bash
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```
En **Ubuntu**, cambia `debian` por `ubuntu` en las dos direcciones (`.../linux/ubuntu/gpg` y `URIs: https://download.docker.com/linux/ubuntu`) y usa `UBUNTU_CODENAME` en lugar de `VERSION_CODENAME`.

Para usar Docker **sin `sudo`**, agrega tu usuario al grupo `docker` y **cierra sesión y vuelve a entrar** (o reinicia):
```bash
sudo usermod -aG docker $USER
```

### 2.2 Windows

**Git y Node.js 26 LTS**, con `winget` (incluido en Windows 10 y 11):
```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
```

**Docker Desktop.** Necesita WSL 2 y la virtualización activada en la BIOS (casi todos los PC recientes la traen activa). Si `wsl --status` falla, instala WSL primero y reinicia:
```powershell
wsl --install
winget install --id Docker.DockerDesktop -e
```
Abre **Docker Desktop** después de instalarlo (y cada vez que vayas a trabajar): la base de datos solo corre mientras Docker Desktop está abierto. Instalarlo requiere permisos de administrador; si tu PC no los da, usa el [anexo: alternativa sin Docker](#anexo-alternativa-sin-docker).

**Si PowerShell bloquea `npm`** con el error *"la ejecución de scripts está deshabilitada"*, permite scripts para tu usuario:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## 3. Obtener el código

**Quién:** solo el **Dev Frontend**. El Dev Backend ya tiene la carpeta, porque creó el [repositorio](GLOSARIO.md#repositorio-git).

Requiere haber aceptado la invitación de [colaborador](GLOSARIO.md#colaborador) y tener tu llave [SSH](GLOSARIO.md#ssh) registrada en GitHub (`ssh -T git@github.com` debe saludarte por tu usuario). Los comandos son iguales en Linux y en Windows:

```bash
git clone git@github.com:sxiks/BIKE-STORE_3400626_EQUIPO_2.git
cd BIKE-STORE_3400626_EQUIPO_2
git switch develop
git branch -vv          # debe mostrar: * develop [origin/develop]
```

Si ya tenías un clon viejo del repositorio, renómbralo como respaldo antes de clonar. **No hagas `push` desde él.**

---

## 4. Levantar la base de datos con Docker

**Quién:** Dev Backend y Dev Frontend, cada uno en su PC.

**Qué hace.** Un solo comando, desde la **raíz del repositorio**, descarga la imagen oficial de PostgreSQL 17 y arranca un [contenedor](GLOSARIO.md#contenedor) llamado `bike-store-db`. **La primera vez**, el script `database/docker/initdb/01-crear-bases.sh`:
- crea el [rol](GLOSARIO.md#rol-postgres) `bike_store_app` con la contraseña de `DB_PASSWORD` del `.env` de la raíz (por defecto `cambia_esta_clave`, la misma de `backend/.env.example`);
- crea las bases `bike_store` y `bike_store_test`, en hora de Colombia;
- aplica las [migraciones](GLOSARIO.md#migracion) 002 a 006 sobre `bike_store` (tablas, [semilla](GLOSARIO.md#semilla), carrito como pedido y galería de imágenes).

Los datos se guardan en un [volumen](GLOSARIO.md#volumen-docker) llamado `bike-store_bike_store_datos`: sobreviven al apagar el contenedor o el PC.

**Primero, las contraseñas** (una sola vez por PC). Las contraseñas de la base no están escritas en el repositorio: cada PC las pone en un archivo `.env` en la **raíz**, que no se sube a GitHub.

```bash
cp .env.example .env       # Windows (PowerShell): Copy-Item .env.example .env
```
Abre ese `.env` y completa:
- `POSTGRES_PASSWORD`: contraseña del superusuario interno de PostgreSQL. **Obligatoria**: elige una propia. Casi nunca la vas a escribir, porque los comandos `docker compose exec` no la piden.
- `DB_PASSWORD`: contraseña del rol `bike_store_app`, que usa la API. Puedes dejar `cambia_esta_clave` o elegir otra; **debe ser la misma** que `DB_PASSWORD` en `backend/.env` y `backend/.env.test` (paso 6).

Si falta `POSTGRES_PASSWORD`, cualquier comando `docker compose` se detiene con el mensaje *"Falta POSTGRES_PASSWORD. Copia .env.example como .env..."*.

**Después, levanta la base.** Los comandos son iguales en Linux y en Windows (PowerShell, con Docker Desktop abierto):
```bash
docker compose up -d       # arranca la base en segundo plano (la primera vez descarga la imagen)
docker compose ps          # STATUS debe decir "healthy" (espera unos segundos si dice "starting")
```

La base queda en `localhost:5433`. Se usa el puerto **5433**, y no el 5432 de siempre, para no chocar con un PostgreSQL que ya esté instalado en el PC. Solo acepta conexiones **desde el mismo PC** (`127.0.0.1`): otros equipos de la red, por ejemplo en el SENA o en un wifi compartido, no pueden conectarse a tu base. La API y las pruebas no se ven afectadas, porque corren en el mismo PC.

**Cambiar una contraseña en una base que ya existe.** Las contraseñas del `.env` de la raíz solo se usan la primera vez que se crea la base. Para cambiarlas después, sin borrar datos:
```bash
docker compose exec db psql -U postgres -c "\password bike_store_app"     # rol de la API: pide la nueva dos veces
docker compose exec db psql -U postgres -c "\password postgres"           # superusuario
```
Después pon la nueva contraseña del rol en `DB_PASSWORD` de `backend/.env`, `backend/.env.test` y el `.env` de la raíz (así se conserva si algún día recreas la base con `down -v`).

| Para | Comando |
|---|---|
| Apagar la base (los datos se conservan) | `docker compose stop` |
| Volver a encenderla | `docker compose start` (o `docker compose up -d`) |
| Ver qué pasó al iniciar (por ejemplo, si una migración falló) | `docker compose logs db` |
| Empezar de cero (**borra todos los datos**) | `docker compose down -v` y después `docker compose up -d` |

Aplicar una migración nueva sin borrar datos y abrir una consola `psql` dentro del contenedor: [database/README](../database/README.md#con-docker).

---

## 5. Comprobar la base de datos

**Quién:** Dev Backend y Dev Frontend.

No necesitas `psql` instalado: se usa el que trae el contenedor.
```bash
docker compose exec db psql -U bike_store_app -d bike_store -c "SELECT count(*) FROM productos;"    # debe dar 10
docker compose exec db psql -U bike_store_app -d bike_store -c "\dt"                              # 7 tablas
docker compose exec db psql -U bike_store_app -l                                                  # aparecen bike_store y bike_store_test
```

Si `productos` no existe o da 0, el volumen se creó antes de que las migraciones terminaran: revisa `docker compose logs db` y empieza de cero con `docker compose down -v` y `docker compose up -d`.

---

## 6. Levantar la API (backend Express)

**Quién:** Dev Backend (obligatorio, es su área de trabajo) y Dev Frontend (para que la interfaz tenga datos reales).

**Qué es y por qué se necesita.** La [API](GLOSARIO.md#api) es el servidor que recibe las peticiones de la interfaz: iniciar sesión, consultar productos, manejar el carrito, crear pedidos. Se conecta a PostgreSQL (la base del [paso 4](#4-levantar-la-base-de-datos-con-docker), que debe estar encendida) con los datos de `backend/.env` y escucha en `http://localhost:3000`. **Sin la API corriendo, el login, el registro y cualquier pantalla con datos reales fallan.** Al arrancar crea automáticamente el usuario administrador definido en el `.env`.

Abre una terminal **solo para la API** y déjala abierta mientras trabajas.

**Linux**
```bash
cd backend
cp .env.example .env      # crea tu configuración local; ya apunta a la base de Docker (puerto 5433)
npm install               # descarga las dependencias (solo la primera vez o si cambia package.json)
npm run dev               # arranca la API y la reinicia sola al guardar cambios
```

**Windows (PowerShell)**
```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

Debe aparecer:
```
Usuario admin creado: admin@bikestore.local
Bike Store API ejecutándose en http://localhost:3000
```

- El archivo [`.env`](GLOSARIO.md#env) es tuyo: **nunca** se sube a GitHub.
- Para detener la API: `Ctrl + C` en esa terminal.

---

## 7. Levantar la interfaz web (frontend React + Vite)

**Quién:** Dev Frontend (obligatorio, es su área de trabajo). Dev Backend: opcional, para probar la integración desde el navegador.

**Qué es y por qué se necesita.** Es la aplicación que ve el usuario: la tienda, el login y el registro. La sirve [Vite](GLOSARIO.md#vite) en `http://localhost:5173` y se recarga sola al guardar cambios. Consume la API del [paso 6](#6-levantar-la-api-backend-express), que debe estar corriendo en otra terminal. Aquí también se ejecutan las pruebas automatizadas del frontend.

Abre **otra** terminal, distinta de la de la API.

**Linux**
```bash
cd frontend
cp .env.example .env      # indica a qué URL está la API (VITE_API_URL)
npm install
npm test                  # debe dar 311 pruebas en verde
npm run dev               # abre http://localhost:5173
```

**Windows (PowerShell)**
```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm test
npm run dev
```

---

## 8. Comprobar que todo funciona

**Quién:** Dev Backend y Dev Frontend.

| Comprobación | Linux | Windows (PowerShell) | Resultado esperado |
|---|---|---|---|
| La API responde | `curl -s http://localhost:3000/api/health` | `Invoke-RestMethod http://localhost:3000/api/health` | `ok: true` |
| El catálogo tiene datos | `curl -s http://localhost:3000/api/productos` | `Invoke-RestMethod http://localhost:3000/api/productos` | 9 productos activos |
| El login funciona | Abre `http://localhost:5173/login` | igual | Con el admin, redirige a la tienda |
| Las pruebas del frontend pasan | `npm test` en `frontend/` | igual | 311 pruebas en verde |
| Las pruebas del backend pasan (Dev Backend) | Una sola vez: crear `.env.test` como indica [backend/README](../backend/README.md#pruebas-automatizadas) (con Docker, `bike_store_test` ya existe). Luego, en `backend/`: `npm run test:db` y `npm test` | igual | `Listo: 10 productos…` y 268 pruebas en verde |

### Usuarios de prueba

| Rol | Cómo obtenerlo |
|---|---|
| admin | `admin@bikestore.local` / `CambiaEsta123`. Lo crea la API al arrancar, desde las variables `ADMIN_*` del `.env`. |
| cliente | Regístralo en `/registro`. La contraseña debe tener mínimo 8 caracteres, con mayúscula, minúscula y número. |

---

**¿Algo falló?** Revisa los [problemas frecuentes en la guía de pruebas locales](GUIA_PRUEBAS_LOCALES.md#4-problemas-frecuentes).

**Siguiente paso:** con todo corriendo, toma tu tarea del sprint en el [ROADMAP](ROADMAP.md) y trabájala con tu guía de prompts ([backend](guias-prompts/GUIA_PROMPTS_BACKEND.md) o [frontend](guias-prompts/GUIA_PROMPTS_FRONTEND.md)), siguiendo el flujo de [CONTRIBUTING](../CONTRIBUTING.md).

---

## Anexo: alternativa sin Docker

**Cuándo usarla:** solo si en tu PC no se puede instalar Docker (por ejemplo, sin permisos de administrador). Reemplaza los [pasos 4](#4-levantar-la-base-de-datos-con-docker) y [5](#5-comprobar-la-base-de-datos); el resto de la guía es igual. Requiere PostgreSQL **15 o superior** (servidor y cliente [`psql`](GLOSARIO.md#psql)).

### A.1 Instalar PostgreSQL

**Linux**
```bash
sudo apt install -y postgresql postgresql-client
sudo systemctl enable --now postgresql
psql --version
```
Debian 13 instala la versión 17 y Ubuntu 24.04 la 16. **Si tu distribución instala una versión menor a 15** (por ejemplo Ubuntu 22.04), usa el repositorio oficial de PostgreSQL:
```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install -y postgresql-17
```

**Windows:** descarga el instalador oficial desde **postgresql.org/download/windows** (versión 16 o 17) y durante la instalación:
1. Deja marcados *PostgreSQL Server* y *Command Line Tools*.
2. **Anota la contraseña** que te pide para el usuario `postgres`. La necesitarás en el paso A.2.
3. Deja el puerto en `5432`.

Luego agrega `psql` al PATH, cambiando `17` por la versión que instalaste:
```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\17\bin", "User")
```

### A.2 Crear el rol y la base de datos

**Una sola vez** por PC.

Esto crea el [rol](GLOSARIO.md#rol-postgres) `bike_store_app` (el usuario con el que se conecta la API, que no es el superusuario `postgres`) y la base `bike_store`, configurada en hora de Colombia.

**Linux**
```bash
sudo -u postgres psql -c "CREATE ROLE bike_store_app WITH LOGIN PASSWORD 'cambia_esta_clave';"
sudo -u postgres psql -c "CREATE DATABASE bike_store OWNER bike_store_app;"
sudo -u postgres psql -c "ALTER DATABASE bike_store SET timezone TO 'America/Bogota';"
```

**Windows (PowerShell).** Cada comando pide la contraseña de `postgres` que anotaste al instalar:
```powershell
psql -U postgres -c "CREATE ROLE bike_store_app WITH LOGIN PASSWORD 'cambia_esta_clave';"
psql -U postgres -c "CREATE DATABASE bike_store OWNER bike_store_app;"
psql -U postgres -c "ALTER DATABASE bike_store SET timezone TO 'America/Bogota';"
```

- La zona horaria hace que las fechas del tablero y el año del número de pedido (`BS-AAAA-…`) queden en hora de Colombia.
- Si usas otra contraseña distinta de `cambia_esta_clave`, ponla también en `backend/.env` (`DB_PASSWORD`) en el [paso 6](#6-levantar-la-api-backend-express), junto con `DB_PORT=5432`.

### A.3 Aplicar las migraciones

Las [migraciones](GLOSARIO.md#migracion) crean las tablas (la `002`), cargan categorías y productos de ejemplo (la `003`, la [semilla](GLOSARIO.md#semilla)) y convierten el carrito en un pedido en estado `carrito` (la `004` y la `005`, decisión D12 del [ROADMAP](ROADMAP.md#resueltas)). Se ejecutan **desde la raíz del repositorio**, **en orden** y **una a la vez**: revisa que cada una termine sin `ERROR` antes de la siguiente.

Para no escribir la contraseña del rol en cada comando, guárdala en una variable que solo dura mientras la terminal esté abierta:

**Linux**
```bash
export PGPASSWORD='cambia_esta_clave'
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/002_modelo_bike_store.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/003_datos_semilla.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/004_estado_pedido_carrito.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/005_carrito_como_pedido.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/006_producto_imagenes.sql
psql -h localhost -U bike_store_app -d bike_store -c "SELECT count(*) FROM productos;"    # debe dar 10
unset PGPASSWORD
```

**Windows (PowerShell)**
```powershell
$env:PGPASSWORD = 'cambia_esta_clave'
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/002_modelo_bike_store.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/003_datos_semilla.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/004_estado_pedido_carrito.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/005_carrito_como_pedido.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/006_producto_imagenes.sql
psql -h localhost -U bike_store_app -d bike_store -c "SELECT count(*) FROM productos;"    # debe dar 10
Remove-Item Env:PGPASSWORD
```

Si usaste otra contraseña al crear el rol en el paso A.2, pon esa en `PGPASSWORD`.

**Si tu base ya tenía la `002` y la `003`** (montaste el entorno antes de la decisión D12): aplica **solo la `004` y luego la `005`**. Comprueba que quedó bien con `psql -h localhost -U bike_store_app -d bike_store -c "\dt"`: deben aparecer 7 tablas y ya no `carritos` ni `carrito_items`. Luego aplica la `006`: quedan 8 tablas, con `producto_imagenes`.

**Si tu base ya tenía de la `002` a la `005`:** aplica **solo la `006`**, con el mismo comando de arriba.

- **Nunca ejecutes** `database/migrations/legacy_mysql/001_base_usuarios_equipos.sql`: es MySQL y falla.
- La `002` y la `005` no se pueden aplicar dos veces sobre la misma base.
- Qué es una migración, cómo empezar de cero y cómo agregar una nueva: [database/README](../database/README.md).

### A.4 Ajustar el puerto en el `.env`

PostgreSQL instalado sin Docker escucha en el puerto **5432**. Después de copiar los archivos de ejemplo, cambia `DB_PORT=5433` por `DB_PORT=5432` en `backend/.env` (paso 6) y, si corres las pruebas del backend, también en `backend/.env.test`.

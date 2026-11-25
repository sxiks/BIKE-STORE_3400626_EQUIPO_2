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
| [4. Crear el rol y la base de datos](#4-crear-el-rol-y-la-base-de-datos) | ✅ | ✅ |
| [5. Aplicar las migraciones](#5-aplicar-las-migraciones) | ✅ | ✅ |
| [6. Levantar la API (backend Express)](#6-levantar-la-api-backend-express) | ✅ | ✅ |
| [7. Levantar la interfaz web (frontend React + Vite)](#7-levantar-la-interfaz-web-frontend-react--vite) | Opcional | ✅ |
| [8. Comprobar que todo funciona](#8-comprobar-que-todo-funciona) | ✅ | ✅ |

En Windows, los comandos de esta guía se ejecutan en **PowerShell**. En Linux, en la terminal (bash).

---

## 1. Verificar los requisitos

**Quién:** Dev Backend y Dev Frontend.

| Herramienta | Versión mínima | Recomendada |
|---|---|---|
| [Node.js](GLOSARIO.md#nodejs) (incluye [npm](GLOSARIO.md#npm)) | **22** | **24 LTS** |
| [Git](GLOSARIO.md#git) | cualquier versión reciente | — |
| [PostgreSQL](GLOSARIO.md#postgresql): servidor y cliente [`psql`](GLOSARIO.md#psql) | **15** | 16 o 17 |

> Node.js 20 dejó de recibir parches de seguridad el 30 de abril de 2026; por eso el mínimo es 22.

**Linux**
```bash
node -v                    # v22.x o superior (ideal v24.x)
npm -v
git --version
psql --version             # cliente: 15 o superior
sudo -u postgres psql -c "SHOW server_version;"     # servidor: 15 o superior
systemctl status postgresql --no-pager              # debe decir "active"
```

**Windows (PowerShell)**
```powershell
node -v
npm -v
git --version
psql --version
psql -U postgres -c "SHOW server_version;"          # pide la contraseña del usuario postgres
Get-Service -Name postgresql*                       # Status debe ser "Running"
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

**Node.js 24 LTS.** Los repositorios de Debian y Ubuntu traen versiones viejas (Debian 13 trae la 20), así que se instala desde NodeSource:
```bash
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_24.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt install -y nodejs
node -v      # v24.x
```

**PostgreSQL**
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

### 2.2 Windows

**Git y Node.js 24 LTS**, con `winget` (incluido en Windows 10 y 11):
```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
```

**PostgreSQL:** descarga el instalador oficial desde **postgresql.org/download/windows** (versión 16 o 17) y durante la instalación:
1. Deja marcados *PostgreSQL Server* y *Command Line Tools*.
2. **Anota la contraseña** que te pide para el usuario `postgres`. La necesitarás en el [paso 4](#4-crear-el-rol-y-la-base-de-datos).
3. Deja el puerto en `5432`.

Luego agrega `psql` al PATH, cambiando `17` por la versión que instalaste:
```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\17\bin", "User")
```

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

## 4. Crear el rol y la base de datos

**Quién:** Dev Backend y Dev Frontend, cada uno en su PC y **una sola vez**.

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
- Si usas otra contraseña distinta de `cambia_esta_clave`, ponla también en `backend/.env` (`DB_PASSWORD`) en el [paso 6](#6-levantar-la-api-backend-express).

---

## 5. Aplicar las migraciones

**Quién:** Dev Backend y Dev Frontend, cada uno en su base.

Las [migraciones](GLOSARIO.md#migracion) crean las 9 tablas (la `002`) y cargan categorías y productos de ejemplo (la `003`, la [semilla](GLOSARIO.md#semilla)). Se ejecutan **desde la raíz del repositorio** y **en orden**; `psql` pide la contraseña del rol (`cambia_esta_clave`). Los comandos son iguales en Linux y en Windows:

```bash
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/002_modelo_bike_store.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/003_datos_semilla.sql
psql -h localhost -U bike_store_app -d bike_store -c "SELECT count(*) FROM productos;"    # debe dar 10
```

- **Nunca ejecutes** `database/migrations/legacy_mysql/001_base_usuarios_equipos.sql`: es MySQL y falla.
- La `002` no se puede aplicar dos veces sobre la misma base.
- Qué es una migración, cómo empezar de cero y cómo agregar una nueva: [database/README](../database/README.md).

---

## 6. Levantar la API (backend Express)

**Quién:** Dev Backend (obligatorio, es su área de trabajo) y Dev Frontend (para que la interfaz tenga datos reales).

**Qué es y por qué se necesita.** La [API](GLOSARIO.md#api) es el servidor que recibe las peticiones de la interfaz: iniciar sesión, consultar productos, manejar el carrito, crear pedidos. Se conecta a PostgreSQL con los datos de `backend/.env` y escucha en `http://localhost:3000`. **Sin la API corriendo, el login, el registro y cualquier pantalla con datos reales fallan.** Al arrancar crea automáticamente el usuario administrador definido en el `.env`.

Abre una terminal **solo para la API** y déjala abierta mientras trabajas.

**Linux**
```bash
cd backend
cp .env.example .env      # crea tu configuración local; los valores coinciden con el paso 4
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
npm test                  # debe dar 12 pruebas en verde
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
| Las pruebas del frontend pasan | `npm test` en `frontend/` | igual | 12 pruebas en verde |

### Usuarios de prueba

| Rol | Cómo obtenerlo |
|---|---|
| admin | `admin@bikestore.local` / `CambiaEsta123`. Lo crea la API al arrancar, desde las variables `ADMIN_*` del `.env`. |
| cliente | Regístralo en `/registro`. La contraseña debe tener mínimo 8 caracteres, con mayúscula, minúscula y número. |

---

**¿Algo falló?** Revisa los [problemas frecuentes en la guía de pruebas locales](GUIA_PRUEBAS_LOCALES.md#4-problemas-frecuentes).

**Siguiente paso:** con todo corriendo, toma tu tarea del sprint en el [ROADMAP](ROADMAP.md) y trabájala con tu guía de prompts ([backend](guias-prompts/GUIA_PROMPTS_BACKEND.md) o [frontend](guias-prompts/GUIA_PROMPTS_FRONTEND.md)), siguiendo el flujo de [CONTRIBUTING](../CONTRIBUTING.md).

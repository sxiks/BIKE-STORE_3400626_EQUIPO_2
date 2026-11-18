# Guía de desarrollo local · Bike Store

Cómo dejar el proyecto corriendo en tu PC y cómo probar los flujos que no tienen pantalla todavía. Sirve para los dos integrantes: **los dos necesitan PostgreSQL y el backend corriendo localmente**, aunque solo el Dev Backend modifique `backend/` y `database/`.

## 1. Requisitos

- Node.js 20 o superior
- Git
- PostgreSQL 15 o superior (el servidor y el cliente `psql`)

### Instalar PostgreSQL

**Debian / Ubuntu**
```bash
sudo apt update
sudo apt install postgresql
sudo systemctl enable --now postgresql
psql --version
```

**Windows**: instala PostgreSQL desde el instalador oficial de postgresql.org/download/windows. Anota la contraseña del usuario `postgres` que te pide el instalador. Agrega `C:\Program Files\PostgreSQL\<versión>\bin` al PATH para poder usar `psql` desde Git Bash. En los comandos de esta guía, cambia `sudo -u postgres psql` por `psql -U postgres`.

## 2. Crear el rol y la base (una sola vez)

```bash
sudo -u postgres psql -c "CREATE ROLE bike_store_app WITH LOGIN PASSWORD 'cambia_esta_clave';"
sudo -u postgres psql -c "CREATE DATABASE bike_store OWNER bike_store_app;"
sudo -u postgres psql -c "ALTER DATABASE bike_store SET timezone TO 'America/Bogota';"
```

- `bike_store_app` es el usuario con el que se conecta la API. No uses el superusuario `postgres` para la aplicación.
- La zona horaria hace que las fechas del tablero y el año del número de pedido (`BS-AAAA-…`) queden en hora de Colombia.
- Si cambias la contraseña aquí, cámbiala también en `backend/.env` (`DB_PASSWORD`).

## 3. Aplicar las migraciones

Desde la raíz del repositorio. `psql` pedirá la contraseña del rol:

```bash
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/002_modelo_bike_store.sql
psql -h localhost -U bike_store_app -d bike_store -v ON_ERROR_STOP=1 -f database/migrations/003_datos_semilla.sql
```

**Nunca ejecutes** `database/migrations/legacy_mysql/001_base_usuarios_equipos.sql`: es MySQL y falla.

Para comprobar que quedó bien:
```bash
psql -h localhost -U bike_store_app -d bike_store -c "SELECT count(*) FROM productos;"   # debe dar 10
```

Por qué hay migraciones y cómo se agregan nuevas: `database/README.md`.

## 4. Backend

```bash
cd backend
cp .env.example .env      # los valores de ejemplo ya coinciden con el paso 2
npm install
npm run dev               # http://localhost:3000
```

Al arrancar debe aparecer:
```
Usuario admin creado: admin@bikestore.local
Bike Store API ejecutándose en http://localhost:3000
```

Si dice `No se pudo iniciar la API: password authentication failed`, la contraseña de `.env` no coincide con la del rol. Si dice `ECONNREFUSED`, PostgreSQL no está corriendo.

## 5. Frontend

En otra terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
npm test                  # 12 pruebas del carrito
```

## 6. Usuarios de prueba

| Rol | Cómo obtenerlo |
|-----|----------------|
| admin | `admin@bikestore.local` / `CambiaEsta123` (lo crea el backend al arrancar, desde `ADMIN_*` del `.env`) |
| cliente | Regístralo en `/registro` o con `POST /api/auth/register`. La contraseña debe tener mínimo 8 caracteres, con mayúscula, minúscula y número. |

## 7. Recuperación de contraseña en desarrollo (CU-11)

En local no hay servidor de correo. El backend entrega el token de dos formas:

1. **Siempre por la consola del backend**, en la terminal donde corre `npm run dev`:
   ```
   [recuperación] Token para ana@correo.com (vence 2026-11-17T23:23:29.174Z): 8581…a23a
   ```
2. **En la respuesta de la API, solo en desarrollo.** Se activa si en `backend/.env` están las dos variables:
   ```
   NODE_ENV=development
   RESET_TOKEN_EN_RESPUESTA=true
   ```
   Entonces `POST /api/auth/recuperar` responde:
   ```json
   { "ok": true, "message": "Si el correo está registrado, se generó un enlace de recuperación",
     "data": { "token_desarrollo": "8581…a23a" } }
   ```
   Si el correo no existe o la cuenta está desactivada, la respuesta es la misma pero **sin `data`**. Así la API no revela qué correos están registrados.

**Probarlo con curl:**
```bash
curl -s -X POST http://localhost:3000/api/auth/recuperar \
  -H "Content-Type: application/json" -d '{"email":"ana@correo.com"}'

curl -s -X POST http://localhost:3000/api/auth/restablecer \
  -H "Content-Type: application/json" \
  -d '{"token":"<el token de 64 caracteres>","password":"Nueva1234"}'
```

**Para el Dev Frontend: cómo usarlo en las pantallas**

- La pantalla "Olvidé mi contraseña" llama a `POST /auth/recuperar` y **siempre** muestra el `message` del backend.
- Si la respuesta trae `data.token_desarrollo`, muestra además un aviso visible **solo en desarrollo** con un enlace a `/restablecer?token=<token>`. Comprueba también `import.meta.env.DEV`, para que el aviso nunca aparezca en un build de producción.
- La pantalla `/restablecer` lee `token` de la URL, pide la nueva contraseña dos veces, valida D7 en el formulario y llama a `POST /auth/restablecer`.
- Si el token no sirve, el error trae `code: "TOKEN_INVALIDO"`. Muestra el mensaje y un enlace para pedir uno nuevo.
- Reglas del token: vence en 30 minutos (`RESET_TOKEN_MINUTOS`), sirve una sola vez, y pedir uno nuevo invalida los anteriores.

En producción (`NODE_ENV=production`) el token **nunca** viaja en la respuesta, aunque `RESET_TOKEN_EN_RESPUESTA` esté en `true`. El envío por correo queda para la fase de despliegue (`docs/ROADMAP.md`, Sprint 5).

## 8. Pago simulado (CU-08)

Para el medio de pago se envía el número completo. El backend lo valida y **solo guarda los últimos 4 dígitos**.

| Medio (`medio_pago`) | Dígitos aceptados | Ejemplo aprobado | Ejemplo rechazado |
|----------------------|-------------------|------------------|-------------------|
| `tarjeta_credito` / `tarjeta_debito` | 13 a 19 (se ignoran espacios y guiones) | `4111 1111 1111 1111` | `4111 1111 1111 0000` |
| `cuenta_bancaria` | 6 a 20 | `12345678` | `12340000` |

**Regla:** si el número termina en `0000`, el pago se rechaza (HTTP 402, el pedido queda `fallido` y se puede reintentar). Cualquier otro número se aprueba.

## 9. Flujo completo con curl (cliente)

```bash
API=http://localhost:3000/api
TOKEN=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ana@correo.com","password":"Nueva1234"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')

curl -s $API/productos                                                     # catálogo
curl -s -X POST $API/carrito/items -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"id_producto":1,"cantidad":1}' # agregar
curl -s -X POST $API/pedidos -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"envio_nombre":"Ana","envio_telefono":"3001234567","envio_departamento":"Valle del Cauca","envio_ciudad":"Palmira","envio_direccion":"Calle 1 # 2-3"}'
curl -s -X POST $API/pedidos/1/pagos -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"medio_pago":"tarjeta_debito","numero":"4111111111111111"}'
```

Contratos completos de cada endpoint: `docs/API_CONTRATOS.md`.

## 10. Problemas frecuentes

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `Falta la variable de entorno: DB_PASSWORD` | No copiaste `.env.example` a `.env` | `cp .env.example .env` |
| `type "rol_usuario" already exists` al aplicar la 002 | Ya la habías aplicado | Normal. Para empezar de cero, ver `database/README.md` |
| Las imágenes de los productos de la semilla no cargan | Los archivos `*.jpg` de la semilla no existen en disco | Esperado. El frontend debe mostrar una imagen de reemplazo (Sprint 2) |
| CORS bloqueado en el navegador | El frontend no corre en `http://localhost:5173` | Ajusta `CORS_ORIGIN` en `backend/.env` |
| Un cliente recibe 403 "Tu cuenta está desactivada" con sesión abierta | Un admin desactivó la cuenta | Esperado: estado y rol se revisan en cada petición |

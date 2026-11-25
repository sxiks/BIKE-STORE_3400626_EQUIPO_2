# Guía de pruebas locales · Bike Store

> **Para qué sirve:** probar a mano los flujos de la API que todavía no tienen pantalla, y resolver los problemas más comunes del entorno.
> **Cuándo usarla:** después de levantar el proyecto con la [guía de ejecución local](GUIA_EJECUCION_LOCAL.md), al construir o revisar pantallas que usan estos flujos, o cuando algo falla.
> ← Volver al [índice de la documentación](README.md) · Términos desconocidos: [GLOSARIO](GLOSARIO.md)

**Requisito:** la API corriendo, como se explica en el [paso 6 de la guía de ejecución](GUIA_EJECUCION_LOCAL.md#6-levantar-la-api-backend-express). Los contratos completos de cada endpoint están en [API_CONTRATOS](diseno-tecnico/API_CONTRATOS.md).

| Sección | Útil para |
|---|---|
| [1. Recuperación de contraseña](#1-recuperación-de-contraseña-cu-11) | Dev Frontend (pantallas de recuperar y restablecer) y Dev Backend (pruebas) |
| [2. Pago simulado](#2-pago-simulado-cu-08) | Ambos (checkout, Sprint 3) |
| [3. Flujo de compra completo](#3-flujo-de-compra-completo-cliente) | Ambos (verificar la API de punta a punta) |
| [4. Problemas frecuentes](#4-problemas-frecuentes) | Ambos |

---

## 1. Recuperación de contraseña (CU-11)

En local no hay servidor de correo. El backend entrega el [token de recuperación](GLOSARIO.md#token-recuperacion) de dos formas:

1. **Siempre por la consola del backend**, en la terminal donde corre `npm run dev`:
   ```
   [recuperación] Token para ana@correo.com (vence 2026-11-17T23:23:29.174Z): 8581…a23a
   ```
2. **En la respuesta de la API, solo en desarrollo.** Se activa si en `backend/.env` están estas dos variables (vienen así en `.env.example`):
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

**Probarlo**

Linux:
```bash
curl -s -X POST http://localhost:3000/api/auth/recuperar \
  -H "Content-Type: application/json" -d '{"email":"ana@correo.com"}'

curl -s -X POST http://localhost:3000/api/auth/restablecer \
  -H "Content-Type: application/json" \
  -d '{"token":"<el token de 64 caracteres>","password":"Nueva1234"}'
```

Windows (PowerShell):
```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/auth/recuperar `
  -ContentType "application/json" -Body '{"email":"ana@correo.com"}'

Invoke-RestMethod -Method Post http://localhost:3000/api/auth/restablecer `
  -ContentType "application/json" -Body '{"token":"<el token de 64 caracteres>","password":"Nueva1234"}'
```

**Para el Dev Frontend: cómo usarlo en las pantallas**

- La pantalla "Olvidé mi contraseña" llama a `POST /auth/recuperar` y **siempre** muestra el `message` del backend.
- Si la respuesta trae `data.token_desarrollo`, muestra además un aviso visible **solo en desarrollo** con un enlace a `/restablecer?token=<token>`. Comprueba también `import.meta.env.DEV`, para que el aviso nunca aparezca en un [build](GLOSARIO.md#build) de producción.
- La pantalla `/restablecer` lee `token` de la URL, pide la nueva contraseña dos veces, valida las reglas de contraseña (D7) en el formulario y llama a `POST /auth/restablecer`.
- Si el token no sirve, el error trae [`code`](GLOSARIO.md#code-error) `"TOKEN_INVALIDO"`. Muestra el mensaje y un enlace para pedir uno nuevo.
- Reglas del token: vence en 30 minutos (`RESET_TOKEN_MINUTOS`), sirve una sola vez, y pedir uno nuevo invalida los anteriores.

En producción (`NODE_ENV=production`) el token **nunca** viaja en la respuesta, aunque `RESET_TOKEN_EN_RESPUESTA` esté en `true`. El envío por correo queda para el Sprint 5 del [ROADMAP](ROADMAP.md#sprint-5--despliegue-pendiente).

---

## 2. Pago simulado (CU-08)

El [pago simulado](GLOSARIO.md#pago-simulado) recibe el número completo del medio de pago. El backend lo valida y **solo guarda los últimos 4 dígitos**.

| Medio (`medio_pago`) | Dígitos aceptados | Ejemplo aprobado | Ejemplo rechazado |
|---|---|---|---|
| `tarjeta_credito` / `tarjeta_debito` | 13 a 19 (se ignoran espacios y guiones) | `4111 1111 1111 1111` | `4111 1111 1111 0000` |
| `cuenta_bancaria` | 6 a 20 | `12345678` | `12340000` |

**Regla:** si el número termina en `0000`, el pago se rechaza: HTTP 402, el pedido queda `fallido` y se puede volver a pagar. Cualquier otro número se aprueba.

Otras respuestas del pago que el frontend debe manejar están en [API_CONTRATOS · Pedidos y pago](diseno-tecnico/API_CONTRATOS.md#pedidos-y-pago--cliente--sprint-3):
- `409 SIN_STOCK`: no se registra ningún pago;
- `409 PEDIDO_YA_PAGADO`.

---

## 3. Flujo de compra completo (cliente)

Necesitas un cliente registrado (ver los [usuarios de prueba](GUIA_EJECUCION_LOCAL.md#usuarios-de-prueba)). El ejemplo usa `ana@correo.com` / `Nueva1234`.

**Linux**
```bash
API=http://localhost:3000/api
TOKEN=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ana@correo.com","password":"Nueva1234"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')

curl -s $API/productos                                                       # 1. catálogo
curl -s -X POST $API/carrito/items -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"id_producto":1,"cantidad":1}'   # 2. agregar al carrito
curl -s -X POST $API/pedidos -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"envio_nombre":"Ana","envio_telefono":"3001234567","envio_departamento":"Valle del Cauca","envio_ciudad":"Palmira","envio_direccion":"Calle 1 # 2-3"}'   # 3. crear pedido
curl -s -X POST $API/pedidos/1/pagos -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"medio_pago":"tarjeta_debito","numero":"4111111111111111"}'           # 4. pagar
```

**Windows (PowerShell)**
```powershell
$API = "http://localhost:3000/api"
$login = Invoke-RestMethod -Method Post "$API/auth/login" -ContentType "application/json" `
  -Body '{"email":"ana@correo.com","password":"Nueva1234"}'
$H = @{ Authorization = "Bearer $($login.data.token)" }

Invoke-RestMethod "$API/productos"                                                        # 1. catálogo
Invoke-RestMethod -Method Post "$API/carrito/items" -Headers $H -ContentType "application/json" `
  -Body '{"id_producto":1,"cantidad":1}'                                                 # 2. agregar al carrito
Invoke-RestMethod -Method Post "$API/pedidos" -Headers $H -ContentType "application/json" `
  -Body '{"envio_nombre":"Ana","envio_telefono":"3001234567","envio_departamento":"Valle del Cauca","envio_ciudad":"Palmira","envio_direccion":"Calle 1 # 2-3"}'   # 3. crear pedido
Invoke-RestMethod -Method Post "$API/pedidos/1/pagos" -Headers $H -ContentType "application/json" `
  -Body '{"medio_pago":"tarjeta_debito","numero":"4111111111111111"}'                    # 4. pagar
```

Cambia el `1` de `/pedidos/1/pagos` por el `id_pedido` que devolvió el paso 3.

---

## 4. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `Falta la variable de entorno: DB_PASSWORD` | No creaste `backend/.env` | Repite el [paso 6 de la guía de ejecución](GUIA_EJECUCION_LOCAL.md#6-levantar-la-api-backend-express) (`cp` o `Copy-Item .env.example .env`) |
| `No se pudo iniciar la API: password authentication failed` | La contraseña de `.env` no coincide con la del rol | Usa la misma que en el [paso 4](GUIA_EJECUCION_LOCAL.md#4-crear-el-rol-y-la-base-de-datos) |
| `No se pudo iniciar la API: … ECONNREFUSED` | PostgreSQL no está corriendo | Linux: `sudo systemctl start postgresql` · Windows: `Start-Service postgresql*` |
| `type "rol_usuario" already exists` al aplicar la 002 | Ya la habías aplicado | Normal. Para empezar de cero, ver [database/README](../database/README.md#cómo-empezar-de-cero-solo-en-desarrollo) |
| Windows: `psql` no se reconoce como comando | `psql` no está en el PATH | Agrégalo como indica el [paso 2.2](GUIA_EJECUCION_LOCAL.md#22-windows) y abre una terminal nueva |
| Windows: *la ejecución de scripts está deshabilitada* al usar `npm` | Política de ejecución de PowerShell | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| Las imágenes de los productos de la semilla no cargan | La semilla no incluye imágenes reales (decisión L) | Esperado. El frontend muestra una imagen de reemplazo (Sprint 2) |
| [CORS](GLOSARIO.md#cors) bloqueado en el navegador | El frontend no corre en `http://localhost:5173` | Ajusta `CORS_ORIGIN` en `backend/.env` |
| Un cliente recibe 403 *"Tu cuenta está desactivada"* con sesión abierta | Un admin desactivó la cuenta | Esperado: el estado y el rol se revisan en cada petición |

---

**Ver también:** [GUIA_EJECUCION_LOCAL](GUIA_EJECUCION_LOCAL.md) · [API_CONTRATOS](diseno-tecnico/API_CONTRATOS.md) · [ROADMAP](ROADMAP.md)

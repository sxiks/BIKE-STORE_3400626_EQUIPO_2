# Contratos de API · Bike Store

> **Para qué sirve:** es la fuente de verdad entre Backend y Frontend: qué recibe y qué responde cada [endpoint](../GLOSARIO.md#endpoint).
> **Cuándo usarlo:** antes de consumir o modificar un endpoint, y para reaccionar a los errores por su [`code`](../GLOSARIO.md#code-error).
> ← Volver al [índice de la documentación](../README.md) · Términos desconocidos: [GLOSARIO](../GLOSARIO.md)

**Se actualiza este documento antes que el código** (ver la [sección 3 de CONTRIBUTING](../../CONTRIBUTING.md#3-contrato-primero)). Todos los endpoints de este documento están implementados y probados, salvo la exportación de CU-18, que está **por implementar en el Sprint 4** (decisión D11 del [ROADMAP](../ROADMAP.md#resueltas)).

- URL base (desarrollo): `http://localhost:3000/api`. En el frontend sale de `VITE_API_URL`.
- Formato: JSON. Los endpoints con imagen usan `multipart/form-data`, con la imagen en el campo `imagen`.
- Autenticación: encabezado `Authorization: Bearer <token>`. El rol y el estado de la cuenta se verifican en la base en **cada** petición.
- Dinero: número en pesos colombianos (COP), con hasta 2 decimales (ej. `2350000`).
- Fechas: texto ISO 8601 en UTC (ej. `"2026-11-17T21:04:49.516Z"`). Los filtros por fecha usan `AAAA-MM-DD`, interpretado en hora de Colombia.

## Formato de respuesta

```jsonc
// Éxito
{ "ok": true, "data": { /* objeto o arreglo */ }, "message": "opcional" }

// Error
{ "ok": false, "message": "Texto listo para mostrar", "code": "OPCIONAL", "data": { /* opcional */ } }
```

`code` existe para que el frontend reaccione sin comparar textos:

| `code` | Cuándo | Qué debería hacer el frontend |
|--------|--------|-------------------------------|
| `CUENTA_DESACTIVADA` | 403 en login o en cualquier petición con sesión | Cerrar la sesión y mostrar el mensaje |
| `TOKEN_INVALIDO` | 400 al restablecer contraseña | Ofrecer pedir un token nuevo |
| `ACCION_SOBRE_SI_MISMO` | 400: un admin intenta cambiarse su propio rol o estado (D5/D6) | Mostrar el mensaje |
| `PRODUCTO_DUPLICADO` | 409 al crear o editar un producto | Marcar el campo nombre |
| `CATEGORIA_DUPLICADA` | 409 al crear o renombrar una categoría | Marcar el campo nombre |
| `CATEGORIA_CON_PRODUCTOS` | 409 al eliminar una categoría que tiene productos (activos o inactivos) | Mostrar el mensaje; `data.total_productos` trae cuántos |
| `PRODUCTO_CON_PEDIDOS` | 409 al eliminar un producto que está o estuvo en un carrito o pedido | Ofrecer inactivarlo en su lugar |
| `LIMITE_IMAGENES` | 409 al agregar una imagen a un producto que ya tiene 5 (portada + 4) | Mostrar el mensaje; `data.maximo` trae el límite |
| `PRODUCTO_INACTIVO` / `SIN_STOCK` | 400 al agregar al carrito; 409 al pagar | Mostrar el mensaje; al pagar, `data.items` lista los productos con problema |
| `STOCK_MAXIMO` | 400: la cantidad supera las existencias | Toast "máximo disponible"; `data.maximo` trae el tope |
| `CANTIDAD_MINIMA` | 400: cantidad 0 en el carrito | Toast con la opción "Sí, eliminar" |
| `CARRITO_VACIO` / `CARRITO_NO_DISPONIBLE` | 400/409 al confirmar el carrito (`POST /pedidos`) | Volver al carrito; `data.items` lista los no disponibles |
| `PEDIDO_YA_PAGADO` | 409 | Ir a la confirmación del pedido |
| `PAGO_RECHAZADO` | 402 | Ofrecer reintentar con otro medio de pago |

| Status | Significado |
|--------|-------------|
| 200 / 201 | OK / creado |
| 400 | Datos inválidos o incompletos |
| 401 | Sin token, token inválido/expirado o credenciales incorrectas |
| 402 | Pago simulado rechazado |
| 403 | Rol sin permiso, o cuenta desactivada |
| 404 | No existe (o no te pertenece) |
| 409 | Conflicto: duplicado, sin stock, pedido ya pagado |
| 500 | Error interno |

## Objetos

```jsonc
Usuario   = { "id_usuario": 2, "nombre": "Ana", "email": "ana@correo.com", "rol": "cliente", "estado": "activo", "created_at": "..." }
Categoria = { "id_categoria": 1, "nombre": "Accesorios" }
CategoriaAdmin = { "id_categoria": 1, "nombre": "Accesorios", "total_productos": 3 }   // cuenta activos e inactivos
Producto  = { "id_producto": 1, "id_categoria": 1, "categoria": "Bicicletas de montaña", "nombre": "MTB Sierra 29",
              "descripcion": "texto o null", "precio": 2890000, "existencias": 8, "imagen": "mtb-sierra-29.jpg",
              "estado": "activo", "disponible": true, "created_at": "..." }
ProductoDetalle = Producto + { "imagenes": [Imagen] }   // solo en GET /productos/:id y GET /productos/admin/:id
Imagen    = { "id_imagen": 7, "imagen": "1795...-123.webp", "orden": 1 }
// Imagen: http://localhost:3000/uploads/productos/<imagen>
// `imagen` del producto es la portada; `imagenes` son las adicionales de la galería (máximo 4), en su orden.
// disponible = estado 'activo' Y existencias > 0
```

---

## Autenticación · Sprint 1

### `POST /auth/register` · pública · CU-09
Request: `{ "nombre": "Ana", "email": "ana@correo.com", "password": "Segura123" }`
- `201` → `{ "ok": true, "message": "Usuario registrado", "data": { "id_usuario": 2 } }`
- `400` faltan datos, correo inválido o contraseña que no cumple D7 (mínimo 8 caracteres, con mayúscula, minúscula y número)
- `409` el correo ya está registrado (sin distinguir mayúsculas)

El correo se guarda en minúsculas y sin espacios. El rol siempre es `cliente`.

### `POST /auth/login` · pública · CU-10
Request: `{ "email": "ana@correo.com", "password": "Segura123" }`
- `200` → `{ "ok": true, "data": { "user": Usuario, "token": "eyJ..." } }`
- `400` faltan datos · `401` credenciales incorrectas · `403` `CUENTA_DESACTIVADA`

### `GET /auth/me` · con sesión · CU-22
- `200` → `{ "ok": true, "data": Usuario }` (rol y estado leídos de la base en ese momento)

### `POST /auth/recuperar` · pública · CU-11
Request: `{ "email": "ana@correo.com" }`
- `200` → `{ "ok": true, "message": "Si el correo está registrado, se generó un enlace de recuperación" }`
- Solo en desarrollo (`NODE_ENV=development` y `RESET_TOKEN_EN_RESPUESTA=true`), y si el correo existe: además `"data": { "token_desarrollo": "<64 hex>" }`. Uso: [sección 1 de GUIA_PRUEBAS_LOCALES](../GUIA_PRUEBAS_LOCALES.md#1-recuperación-de-contraseña-cu-11).
- `400` correo con formato inválido

### `POST /auth/restablecer` · pública · CU-11
Request: `{ "token": "<64 hex>", "password": "Nueva1234" }`
- `200` → `{ "ok": true, "message": "Contraseña actualizada. Ya puedes iniciar sesión" }`
- `400` `TOKEN_INVALIDO` (no existe, venció o ya se usó) o contraseña que no cumple D7

## Usuarios · admin · Sprint 1

### `GET /usuarios?q=&rol=&estado=` · CU-19
`q` busca por nombre o correo (contiene, sin distinguir mayúsculas); `rol` es `admin|cliente`; `estado` es `activo|inactivo`.
- `200` → `{ "ok": true, "data": [Usuario] }`

### `PATCH /usuarios/:id/rol` · CU-20
Request: `{ "rol": "admin" }` → `200` con `data: Usuario`
- `400` `ACCION_SOBRE_SI_MISMO` (D5) · `404`

### `PATCH /usuarios/:id/estado` · CU-21
Request: `{ "estado": "inactivo" }` → `200` con `data: Usuario`
- `400` `ACCION_SOBRE_SI_MISMO` (D6) · `404`

Efecto inmediato: el usuario desactivado recibe 403 `CUENTA_DESACTIVADA` en su siguiente petición, aunque su token no haya vencido.

## Catálogo y productos · Sprint 2

### `GET /categorias` · pública · CU-02
- `200` → `{ "ok": true, "data": [Categoria] }`

### `GET /categorias/admin` · admin · B2.2
Todas las categorías con su número de productos, para saber cuáles se pueden eliminar. Orden por nombre.
- `200` → `{ "ok": true, "data": [CategoriaAdmin] }`

### `POST /categorias` · admin · B2.2
Request: `{ "nombre": "Repuestos" }` (obligatorio, máximo 100 caracteres).
- `201` → `data: CategoriaAdmin` · `400` · `409` `CATEGORIA_DUPLICADA` (mismo nombre sin distinguir mayúsculas)

### `PUT /categorias/:id` · admin · B2.2
Request: `{ "nombre": "Repuestos y partes" }`. Los productos de la categoría muestran el nombre nuevo.
- `200` → `data: CategoriaAdmin` · `400` · `404` · `409` `CATEGORIA_DUPLICADA`

### `DELETE /categorias/:id` · admin · B2.2
Solo si la categoría no tiene productos, ni activos ni inactivos (decisión M).
- `200` → `data: { "id_categoria": 6 }` · `404` · `409` `CATEGORIA_CON_PRODUCTOS` con `data.total_productos`

### `GET /productos?categoria=&orden=` · pública · CU-01, CU-02
Solo productos **activos** (incluye los agotados, con `disponible: false`). `categoria` es un id; `orden` es `precio_asc` o `precio_desc` (sin `orden`, se ordena por nombre).
- `200` → `{ "ok": true, "data": [Producto] }` · `400` parámetro inválido

### `GET /productos/:id` · pública
- `200` → `data: ProductoDetalle` (con la galería) · `404` si no existe o está inactivo

### `GET /productos/admin?q=&categoria=&estado=` · admin · CU-15
Incluye los inactivos. `q` busca por nombre, como "contiene" y sin distinguir mayúsculas; `%` y `_` se buscan como texto, no como comodines.
- `200` → `{ "ok": true, "data": [Producto] }`

### `GET /productos/admin/:id` · admin
- `200` → `data: ProductoDetalle` (aunque esté inactivo)

### `POST /productos` · admin · CU-12 · multipart
Campos: `nombre`*, `precio`* (> 0), `existencias`* (entero ≥ 0), `id_categoria`*, `imagen`* (jpg/png/webp ≤ 2 MB) y `descripcion` (opcional).
- La imagen se valida dos veces: por su tipo (`Content-Type` del archivo) y por su contenido (los primeros bytes deben corresponder a ese tipo). El archivo se guarda con un nombre generado y la extensión del tipo (`.jpg`, `.png` o `.webp`), nunca con la del nombre original.
- `201` → `data: Producto`
- `400` falta algún dato, categoría inexistente, imagen demasiado grande (*"La imagen supera el máximo de 2 MB"*), tipo no permitido (*"Formato de imagen no permitido…"*) o archivo que no es una imagen de ese tipo (*"El archivo no es una imagen válida…"*). En cualquier error, la imagen subida se borra
- `409` `PRODUCTO_DUPLICADO` (mismo nombre en la misma categoría, sin distinguir mayúsculas)

### `PUT /productos/:id` · admin · CU-13 · multipart
Actualización **parcial**: solo se cambian los campos enviados. Si llega una `imagen` nueva, reemplaza a la anterior y la anterior se borra del disco.
- `200` → `data: Producto` · `400` · `404` · `409` `PRODUCTO_DUPLICADO`

### `PATCH /productos/:id/estado` · admin · CU-14
Request: `{ "estado": "inactivo" }`. Es borrado lógico y es **la forma normal** de retirar un producto: conserva su historia en los pedidos y se puede volver a activar.
- `200` → `data: Producto` · `404`

### `DELETE /productos/:id` · admin · B2.2
Elimina el producto de verdad, **solo si nunca estuvo en un carrito ni en un pedido** (decisión M); sirve para corregir un producto creado por error. También borra del disco la portada y las imágenes de la galería.
- `200` → `data: { "id_producto": 12 }` · `404` · `409` `PRODUCTO_CON_PEDIDOS` (*"…inactívalo en su lugar"*)

### `POST /productos/:id/imagenes` · admin · B2.2 · multipart
Agrega **una** imagen a la galería (campo `imagen`, con la misma validación doble que al crear). Va al final del orden.
- `201` → `data: ProductoDetalle` · `400` imagen inválida (se borra) · `404` · `409` `LIMITE_IMAGENES` (ya tiene 5 contando la portada; la imagen subida se borra)

### `DELETE /productos/:id/imagenes/:idImagen` · admin · B2.2
Quita una imagen de la galería y borra su archivo. La portada no se quita así: se reemplaza con `PUT /productos/:id` o eligiendo otra como portada.
- `200` → `data: ProductoDetalle` · `404` (el producto no existe o la imagen no es suya)

### `PATCH /productos/:id/imagenes/:idImagen/portada` · admin · B2.2
Intercambio: esa imagen pasa a ser la portada y la portada anterior ocupa su lugar en la galería. No se borra ningún archivo.
- `200` → `data: ProductoDetalle` · `404`

### `PATCH /productos/:id/imagenes/orden` · admin · B2.2
Request: `{ "ids": [9, 7, 8] }`: **todos** los `id_imagen` de la galería del producto, cada uno una vez, en el orden nuevo.
- `200` → `data: ProductoDetalle` · `400` si falta, sobra o se repite algún id · `404`

## Carrito · cliente · Sprint 3

Requiere sesión con rol `cliente` (D1, K): sin sesión responde `401`; con rol `admin`, `403`. Cada cliente tiene un carrito guardado en la base (CU-06).

El carrito **no es una entidad propia**: es el pedido del cliente en estado `carrito` (decisión D12 del [ROADMAP](../ROADMAP.md#resueltas)), y sus ítems son líneas de `detalle_pedido`. No tiene número de pedido ni fecha de pedido mientras no se confirme. Cada cliente tiene como máximo un carrito.

- **El carrito se crea al agregar el primer producto.** Consultarlo no lo crea: si el cliente todavía no tiene, `GET /carrito` responde un carrito vacío con `id_pedido: null`.
- Al confirmarlo con `POST /pedidos` deja de ser carrito; el siguiente producto que se agregue crea uno nuevo.
- Agregar, modificar y eliminar se hacen en una transacción que bloquea el carrito: si el cliente confirma la compra al mismo tiempo (dos pestañas, doble clic), una operación espera a la otra y nunca se modifica un pedido ya confirmado.

```jsonc
Carrito = {
  "id_pedido": 7,            // id del pedido en estado carrito; null si el cliente todavía no tiene carrito
  "items": [{
    "id_producto": 2, "nombre": "MTB Páramo 27.5", "imagen": "mtb-paramo-275.jpg",
    "precio": 2350000, "existencias": 3, "estado": "activo",
    "cantidad": 1, "subtotal": 2350000,
    "disponible": true,
    "motivo": null           // null | "INACTIVO" | "SIN_STOCK" | "SUPERA_STOCK"
  }],
  "total_unidades": 1,
  "total": 2350000,
  "puede_comprar": true      // false si está vacío o algún ítem no está disponible (CU-07)
}
```
`precio` es el precio **actual** del producto.

| Endpoint | Request | Éxito | Errores |
|----------|---------|-------|---------|
| `GET /carrito` | – | `200 data: Carrito` (vacío con `id_pedido: null` si no hay carrito; no lo crea) | – |
| `POST /carrito/items` · CU-03 | `{ "id_producto": 2, "cantidad": 1 }` (por defecto 1). Si ya está, **se suman** las cantidades (R2). Si el cliente no tiene carrito, lo crea. | `200 data: Carrito` | `400 PRODUCTO_INACTIVO`, `SIN_STOCK`, `STOCK_MAXIMO` (`data.maximo`, `data.en_carrito`) · `404` |
| `PUT /carrito/items/:id_producto` · CU-05 | `{ "cantidad": 3 }` (fija la cantidad) | `200 data: Carrito` | `400 CANTIDAD_MINIMA` (si es 0), `STOCK_MAXIMO`, decimal o negativo · `404` si no está en el carrito o el cliente no tiene carrito |
| `DELETE /carrito/items/:id_producto` | – | `200 data: Carrito` | `404` si no está en el carrito o el cliente no tiene carrito. Siempre se permite eliminar, incluso un producto inactivo (D4). |

## Pedidos y pago · cliente · Sprint 3

```jsonc
Pedido = {
  "id_pedido": 1, "numero_pedido": "BS-2026-000001", "id_usuario": 2,
  "estado": "pendiente",     // pendiente | pagado | fallido (un carrito nunca se devuelve como Pedido)
  "envio_nombre": "Ana", "envio_telefono": "3001234567", "envio_departamento": "Valle del Cauca",
  "envio_ciudad": "Palmira", "envio_direccion": "Calle 1 # 2-3",
  "fecha_pedido": "...",     // momento de confirmación (carrito -> pendiente): es la fecha del pedido
  "created_at": "...",       // auditoría: cuándo se empezó el carrito
  "total": 2350000,          // calculado: SUM(cantidad * precio_unitario)
  "items": [{ "id_producto": 2, "nombre": "MTB Páramo 27.5", "cantidad": 1, "precio_unitario": 2350000, "subtotal": 2350000 }],
  "pagos": [{ "id_pago": 1, "medio_pago": "tarjeta_debito", "ultimos4": "1111", "valor": 2350000, "estado": "aprobado", "created_at": "..." }]
}
```

### `POST /pedidos` · CU-07, CU-08
**Confirma el carrito**: en una transacción valida que no esté vacío y que todos sus productos estén activos y con existencias, refresca el precio de cada línea al precio vigente (R3), guarda los datos de envío y lo pasa a **pendiente**. La base le asigna `fecha_pedido` y `numero_pedido` en ese momento. **No** descuenta stock (se descuenta al pagar).
Como el carrito se convierte en el pedido, **el carrito queda vacío al confirmar**, no al pagar. Si el pago se rechaza, se reintenta sobre el mismo pedido (decisión F).
Request: `{ "envio_nombre", "envio_telefono", "envio_departamento", "envio_ciudad", "envio_direccion" }`, todos obligatorios.
- `201` → `data: Pedido`
- `400` datos de envío incompletos o `CARRITO_VACIO` · `409` `CARRITO_NO_DISPONIBLE` (`data.items`: `[{ id_producto, nombre, motivo }]`). En ambos errores el carrito queda como estaba.

### `POST /pedidos/:id/pagos` · CU-08
Request: `{ "medio_pago": "tarjeta_credito" | "tarjeta_debito" | "cuenta_bancaria", "numero": "4111 1111 1111 1111" }`
- Tarjetas: entre 13 y 19 dígitos. Cuenta bancaria: entre 6 y 20. Se ignoran espacios y guiones. **Solo se guardan los últimos 4.**
- **Simulación:** un número que termina en `0000` se rechaza.

Respuestas:
- `201` aprobado → `{ "ok": true, "message": "Pago aprobado", "data": { "numero_pedido", "estado": "pagado", "valor_pagado", "pago": { ... } } }`. Se descuenta el stock. El carrito no se toca: ya se vació al confirmar, y si el cliente empezó otro, ese se conserva.
- `402` rechazado → `{ "ok": false, "code": "PAGO_RECHAZADO", "message", "data": { "numero_pedido", "estado": "fallido", "pago": { ... } } }`. El pedido se puede **volver a pagar** (decisión F).
- `409` `SIN_STOCK` → algún producto ya no tiene existencias o se inactivó. **No se registra ningún pago** y el pedido sigue como estaba (decisión E). `data.items` trae el detalle.
- `409` `PEDIDO_YA_PAGADO` · `400` datos de pago inválidos · `404` el pedido no existe, no es tuyo o todavía es un carrito (hay que confirmarlo primero)

### `GET /pedidos` · cliente
- `200` → `data: [Pedido sin items ni pagos]`, solo los confirmados (nunca el carrito), del más reciente al más antiguo por `fecha_pedido`

### `GET /pedidos/:numero` · dueño del pedido o admin
Ejemplo: `GET /pedidos/BS-2026-000001`
- `200` → `data: Pedido` · `404`

### `GET /pedidos/admin?q=&estado=&desde=&hasta=` · admin · B4 (decisión N)
Todos los pedidos **confirmados** de todos los clientes (nunca los carritos), del más reciente al más antiguo por `fecha_pedido`. Todos los filtros son opcionales:
- `q`: busca, sin distinguir mayúsculas y como "contiene", en el número del pedido, el nombre y el correo del cliente; `%` y `_` se buscan como texto.
- `estado`: `pendiente` | `pagado` | `fallido`.
- `desde`, `hasta`: `AAAA-MM-DD`, rango inclusivo sobre `fecha_pedido` en hora de Colombia (mismas reglas que `/dashboard/metricas`).

```jsonc
PedidoAdmin = Pedido sin items ni pagos + { "cliente_nombre": "Ana Cliente", "cliente_email": "ana@correo.com", "unidades": 3 }
```
- `200` → `{ "ok": true, "data": [PedidoAdmin] }` (máximo 200; con más, hay que filtrar) · `400` estado o fecha inválidos, o `desde` posterior a `hasta` · `401` · `403` (cliente)
- El detalle de cada pedido es `GET /pedidos/:numero`, que el admin ya puede ver.

## Tablero · admin · Sprint 4

### `GET /dashboard/metricas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&categoria=` · CU-16, CU-17
Solo cuenta pedidos **pagados** y filtra por **`fecha_pedido`** (fecha de confirmación). Los carritos nunca cuentan. El rango es inclusivo y se interpreta en hora de Colombia. Todos los filtros son opcionales.
```jsonc
{ "filtros": { "desde": "2026-11-01", "hasta": "2026-11-30", "categoria": null },
  "ventas_totales": 2350000, "cantidad_pedidos": 1, "unidades_vendidas": 1,
  "mas_vendidos": [{ "id_producto": 2, "nombre": "MTB Páramo 27.5", "unidades": 1, "ventas": 2350000 }] }  // top 5
```
- `400` fecha inválida o `desde` posterior a `hasta`

### `GET /dashboard/alertas` · CU-16
```jsonc
{ "umbral_stock_bajo": 5,
  "stock_bajo": [{ "id_producto", "nombre", "existencias" }],   // activos con 0 < existencias <= umbral
  "agotados": [{ "id_producto", "nombre" }],
  "inactivos_en_carritos": [{ "id_producto", "nombre", "carritos" }],  // carritos = pedidos en estado carrito que lo contienen
  "pedidos_pendientes": [{ "id_pedido", "numero_pedido", "fecha_pedido" }],  // últimos 50; nunca incluye carritos
  "pedidos_fallidos": [ ... ] }
```

### `GET /dashboard/exportar?formato=xlsx|pdf&desde=&hasta=&categoria=` · admin · CU-18
Decisión D11: el archivo se genera en el backend con `exceljs` (xlsx) y `pdfkit` (pdf), **en memoria** (no se guarda en disco); el frontend solo lo descarga (tarea [F4.2](../guias-prompts/GUIA_PROMPTS_FRONTEND.md#f42--exportar-informes)). Las cifras salen de las mismas consultas que `/dashboard/metricas` y `/dashboard/alertas`, así que coinciden con el tablero para el mismo filtro.

Query params: `formato` (obligatorio: `xlsx` | `pdf`), y `desde`, `hasta` y `categoria` con las mismas reglas que `/dashboard/metricas`.

Contenido del informe:
1. **Encabezado:** "Informe de ventas · Bike Store", fecha y hora de generación (hora de Colombia) y filtros aplicados (periodo y nombre de la categoría, o "Todos").
2. **Resumen:** ventas totales (COP), cantidad de pedidos pagados y unidades vendidas.
3. **Más vendidos:** los 5 primeros con unidades y ventas (COP).
4. **Inventario** (estado actual, no depende del filtro): productos con stock bajo (umbral `STOCK_BAJO_UMBRAL`) y agotados.

En el Excel, las secciones 1 a 3 van en la hoja **"Resumen"** y la 4 en la hoja **"Inventario"**, con los montos como números en formato COP (se pueden sumar). En el PDF van en ese orden, en tamaño carta.

Respuestas:
- `200` → el archivo (no JSON), con `Content-Disposition: attachment; filename="bike-store-informe-AAAA-MM-DD.<formato>"` (fecha de generación) y `Content-Type`:
  - xlsx: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - pdf: `application/pdf`
- `400` formato ausente o inválido, fecha inválida, `desde` posterior a `hasta` o categoría inválida (JSON, como los demás errores) · `401` · `403` (cliente)
- CORS expone `Content-Disposition` (`exposedHeaders`), para que el frontend, que está en otro origen, pueda leer el nombre del archivo.

---

## Plantilla para nuevos endpoints

````markdown
### `MÉTODO /ruta/:param` · Rol: pública | cliente | admin · CU-XX

Descripción breve.

Query params: `?param=valor` (si aplica)

Request:
```json
{ }
```

Respuestas:
- `200` → `{ "ok": true, "data": { } }`
- `400` `CODIGO` → cuándo

Notas de negocio: reglas que el frontend debe conocer.
````

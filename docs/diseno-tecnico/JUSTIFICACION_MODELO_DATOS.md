# Bike Store · Justificación técnica del modelo de datos

> **Para qué sirve:** justifica cada decisión del [MER](../GLOSARIO.md#mer), del [modelo relacional](../GLOSARIO.md#mr) y de las restricciones de la base.
> **Cuándo usarlo:** para sustentar el modelo ante el instructor o cuando dudes por qué una tabla es como es. El resumen está en [MODELO_DATOS](MODELO_DATOS.md).
> ← Volver al [índice de la documentación](../README.md) · Términos desconocidos: [GLOSARIO](../GLOSARIO.md)

**Base:** MER (notación Chen), Modelo Relacional (ER), Diccionario de datos y `002_modelo_bike_store.sql` · PostgreSQL 15+ · Moneda COP

---

## 1. Modelo Entidad-Relación (MER)

### 1.1 Entidades

| Entidad | Por qué existe como entidad propia |
|---|---|
| **Usuario** | Es el actor del sistema: inicia sesión, compra, administra (CU-09, CU-10, CU-19 a CU-22). Clientes y administradores comparten los mismos datos; solo cambia el `rol`, por eso no hay dos entidades. |
| **Categoria** | Los productos se filtran por categoría (CU-02) y el tablero también (CU-17). Si la categoría fuera un texto dentro de Producto, se repetiría y un error de escritura crearía "categorías fantasma". Separarla cumple la 3FN. |
| **Producto** | Es lo que se vende: tiene precio, existencias, imagen y estado propios (CU-01, CU-12 a CU-15). |
| **Carrito** | Representa la compra en preparación de un cliente y debe conservarse entre visitas (CU-06). Es el "encabezado" que agrupa los ítems. |
| **Pedido** | Es la compra confirmada: tiene número único, estado y dirección de envío (CU-07, CU-08). Debe existir aunque luego cambien los productos o los precios. |
| **Pago** | Un pedido puede tener varios intentos de pago (uno rechazado y luego uno aprobado). Si el pago fuera atributo del pedido, se perderían los intentos fallidos. |
| **TokenRecuperacion** | La recuperación de contraseña (CU-11) necesita guardar cada token con su vencimiento y si ya se usó. Un usuario puede pedir varios a lo largo del tiempo. |

**Entidades asociativas** (rombo dentro de rectángulo):

| Asociativa | Relaciona | Por qué es asociativa y no un simple rombo |
|---|---|---|
| **CarritoItem** | Carrito ↔ Producto (N:M) | Un carrito tiene muchos productos y un producto está en muchos carritos. La relación tiene un dato propio, la `cantidad`, que no pertenece ni al carrito ni al producto. |
| **DetallePedido** | Pedido ↔ Producto (N:M) | Igual que la anterior, pero además guarda el `precio_unitario` del momento de la compra. Ese precio solo existe en la relación. |

### 1.2 Cardinalidades

| Relación | Cardinalidad | Justificación |
|---|---|---|
| Usuario **tiene** Carrito | 1:1 | Un cliente tiene un solo carrito persistente. Un usuario puede no tenerlo todavía (se crea la primera vez que agrega algo), y los administradores no usan carrito. |
| Usuario **realiza** Pedido | 1:N | Un cliente hace muchos pedidos; cada pedido es de un solo cliente. |
| Usuario **solicita** TokenRecuperacion | 1:N | Un usuario puede pedir varios tokens en el tiempo; cada token pertenece a un usuario. |
| Categoria **clasifica** Producto | 1:N | Una categoría agrupa muchos productos; cada producto está en una sola categoría (así lo exige el filtro de CU-02). |
| Pedido **se paga con** Pago | 1:N | Permite reintentar tras un rechazo. La regla "máximo un pago aprobado por pedido" se garantiza en el MR con un índice parcial. |
| Carrito – Producto (CarritoItem) | N:M | Resuelta con la asociativa. |
| Pedido – Producto (DetallePedido) | N:M | Resuelta con la asociativa. Un pedido debe tener al menos un producto. |

### 1.3 Atributo compuesto: `direccion_envio`

Se dibuja como una elipse con 5 hijas: `envio_nombre`, `envio_telefono`, `envio_departamento`, `envio_ciudad` y `envio_direccion`.

- **Por qué compuesto:** es un solo concepto (a dónde se envía) formado por partes que se validan por separado. Al pasar a tablas se descompone en 5 columnas simples, porque la 1FN exige valores atómicos.
- **Por qué vive en Pedido y no en Usuario ni en una tabla `direcciones`:**
  - Es una **copia histórica**: si el cliente se muda, sus pedidos anteriores deben conservar la dirección a la que realmente se enviaron.
  - Ningún requerimiento pide una libreta de direcciones guardadas. Crear la tabla agregaría un JOIN sin necesidad.
- No es redundancia: es la "foto" de los datos en el momento de la compra.

### 1.4 Atributos derivados (no se almacenan)

Se dibujan con elipse punteada porque **se muestran pero se calculan**.

| Atributo | Cómo se calcula | Por qué no se guarda |
|---|---|---|
| `total` (Pedido) | `SUM(cantidad × precio_unitario)` sobre `detalle_pedido` | Guardarlo duplicaría información. Si alguien modifica el detalle y olvida el total, la base queda inconsistente. Calculado, siempre es correcto. Lo efectivamente cobrado queda en `pagos.valor`. |
| `disponibilidad` (Producto) | `estado = 'activo' AND existencias > 0` | Depende de dos columnas que cambian con cada venta o inactivación. Guardarlo obligaría a actualizarlo cada vez y podría contradecir a las columnas reales. |

### 1.5 Otras decisiones del MER

- **Las llaves foráneas no se dibujan en el MER.** En notación Chen la relación la representa el rombo; las FK aparecen recién en el MR.
- **`created_at` solo se dibuja en Pedido y en Pago,** porque ahí tiene significado de negocio (fecha del pedido y fecha del pago). En las demás tablas es una columna de auditoría y aparece solo en el MR.

---

## 2. Modelo Relacional (MR)

### 2.1 Paso del MER a tablas

| Regla aplicada | Resultado |
|---|---|
| Cada entidad pasa a una tabla, con nombre en snake_case y plural | `usuarios`, `categorias`, `productos`, `carritos`, `pedidos`, `pagos`, `tokens_recuperacion` |
| En una relación 1:N, la PK del lado "1" pasa como FK al lado "N" | `productos.id_categoria`, `pedidos.id_usuario`, `pagos.id_pedido`, `tokens_recuperacion.id_usuario` |
| En una relación 1:1, la FK va en la tabla dependiente y se marca `UNIQUE` | `carritos.id_usuario UNIQUE`: es lo que convierte la relación en 1:1 |
| Cada N:M pasa a una tabla asociativa con las dos FK | `carrito_items`, `detalle_pedido` |
| Cada atributo compuesto se descompone en columnas simples | `pedidos.envio_*` (5 columnas) |
| Los atributos derivados no pasan a tablas | No existen columnas `total` ni `disponible` |

**Llave primaria:** todas las tablas usan `id_<singular> INT GENERATED ALWAYS AS IDENTITY`.

- Es una llave **subrogada**: un número sin significado, que nunca cambia. Si se usara el correo o el nombre como PK, cambiarlos rompería todas las referencias.
- `IDENTITY` es el estándar SQL (reemplaza a `SERIAL`). `ALWAYS` impide que alguien inserte un id a mano y cause choques.

### 2.2 Tablas asociativas: `carrito_items` y `detalle_pedido`

| Decisión | Por qué |
|---|---|
| Cada una tiene sus 2 FK (`id_carrito` + `id_producto`, `id_pedido` + `id_producto`) | Es la forma relacional de representar una N:M. |
| Tienen PK propia (`id_carrito_item`, `id_detalle_pedido`) en lugar de una PK compuesta | Mantiene una sola convención en todo el modelo y simplifica referenciar una línea concreta desde el código. |
| Llevan `UNIQUE(id_carrito, id_producto)` y `UNIQUE(id_pedido, id_producto)` | Garantizan que un producto aparezca **una sola vez** por carrito o por pedido. Si el cliente agrega otra unidad, se suma la cantidad en vez de crear una línea duplicada (R2). Cumple lo que haría una PK compuesta. |
| `detalle_pedido.precio_unitario` es una copia del precio | Si el administrador cambia el precio mañana, los pedidos de hoy deben conservar lo que el cliente pagó (R3). No es redundancia: es un dato histórico distinto del precio actual. |

### 2.3 Tipos ENUM

```sql
rol_usuario      ('admin', 'cliente')
estado_registro  ('activo', 'inactivo')            -- compartido por usuarios y productos
estado_pedido    ('pendiente', 'pagado', 'fallido')
medio_pago_tipo  ('tarjeta_credito', 'tarjeta_debito', 'cuenta_bancaria')
estado_pago      ('aprobado', 'rechazado')
```

| Por qué ENUM | Explicación |
|---|---|
| Conjuntos pequeños y fijos | Son 2 o 3 valores que no cambian con la operación diaria. |
| La base rechaza valores inválidos | Escribir `'Admin'` o `'activ'` produce un error. Con `VARCHAR` se guardaría sin avisar. |
| Más simple que una tabla de catálogo | Una tabla `roles` obligaría a un JOIN en cada consulta. Hay 2 roles fijos y un solo rol por usuario (no es N:M), así que la tabla no aporta nada. |
| Se reutiliza | `estado_registro` sirve igual para la cuenta de un usuario y para el borrado lógico de un producto. |

**Costo aceptado:** agregar un valor nuevo exige una migración (`ALTER TYPE`). Como estos valores casi nunca cambian, compensa.

### 2.4 Índices únicos con `lower()`

```sql
CREATE UNIQUE INDEX uq_usuarios_email            ON usuarios   (lower(email));
CREATE UNIQUE INDEX uq_categorias_nombre         ON categorias (lower(nombre));
CREATE UNIQUE INDEX uq_productos_categoria_nombre ON productos (id_categoria, lower(nombre));
```

- **Problema:** un `UNIQUE(email)` normal permite registrar `Ana@Correo.com` y `ana@correo.com` como si fueran dos correos distintos, porque PostgreSQL distingue mayúsculas.
- **Solución:** el índice se construye sobre el valor en minúsculas. Para la base, ambos correos son el mismo y el segundo es rechazado.
- **Por qué no `citext`:** es una extensión adicional que hay que instalar. `lower()` viene incluido y logra lo mismo.
- **Productos:** la unicidad es por categoría (criterio de duplicado de CU-12). Puede existir "Casco Pro" en dos categorías, pero no dos veces en la misma.
- **Condición para el código:** las consultas deben comparar con `lower(email) = lower($1)` para que el índice se use.

### 2.5 Trigger para `numero_pedido`

```sql
-- BEFORE INSERT en pedidos
NEW.numero_pedido := 'BS-' || año(created_at) || '-' || id_pedido con ceros a la izquierda
-- Resultado: BS-2026-000001
```

| Pregunta | Respuesta |
|---|---|
| ¿Por qué un número aparte del `id_pedido`? | El id es interno. El cliente necesita un código legible para reclamar o consultar (R4), que no revele detalles internos. |
| ¿Por qué en un trigger y no en el backend? | La regla vive en un solo lugar: cualquier inserción recibe su número, venga de la API, de un script o de un administrador. El código no puede olvidarlo ni generarlo mal. |
| ¿Por qué es único sin riesgo de choques? | Se construye a partir del `id_pedido`, que ya es único. Dos pedidos simultáneos nunca reciben el mismo número, sin necesidad de bloqueos ni secuencias extra. |
| ¿Por qué `BEFORE INSERT`? | En ese momento PostgreSQL ya calculó el `id_pedido` y el `created_at`, y todavía se puede completar la fila antes de guardarla. Así se cumple el `NOT NULL` de `numero_pedido`. |
| ¿Qué pasa al llegar a 1.000.000 de pedidos? | Se agregan dígitos (`greatest(6, …)`): no se trunca ni se repite. |

**Detalle operativo:** el año sale de la zona horaria de la sesión. Por eso la base se configura en `America/Bogota`; si no, un pedido del 31 de diciembre a las 22:00 quedaría con el año siguiente.

### 2.6 Índices de rendimiento

PostgreSQL **no** crea índices automáticamente para las FK. Se crearon los que usan las consultas reales:

| Índice | Consulta que acelera |
|---|---|
| `productos (estado, id_categoria, precio)` | Catálogo filtrado por categoría y ordenado por precio (CU-01, CU-02) |
| `productos (estado, precio)` | Catálogo sin filtro de categoría, ordenado por precio |
| `pedidos (estado, created_at)` | Ventas pagadas por rango de fechas (CU-16, CU-17) |
| `pedidos (id_usuario)` | "Mis pedidos" |
| `detalle_pedido (id_producto)` | Productos más vendidos y filtro por categoría del tablero |
| `carrito_items (id_producto)` | Alerta de productos inactivos dentro de carritos |
| `pagos (id_pedido)` · `tokens_recuperacion (id_usuario)` | Búsquedas por la FK |

Los **filtros** no se dibujan en el MER ni en el ER porque no son datos sino consultas (`WHERE`, `ORDER BY`). Se reflejan en el modelo a través de los atributos que filtran y de estos índices.

---

## 3. Diccionario de la base de datos: restricciones de integridad

### 3.1 `NOT NULL`: dato obligatorio

**Regla general:** una columna es `NOT NULL` cuando sin ese dato el registro no tiene sentido o el negocio no puede operar.

| Columna(s) | Por qué es obligatoria |
|---|---|
| `usuarios.nombre`, `email`, `password`, `rol`, `estado` | Sin correo y contraseña no hay inicio de sesión; sin rol y estado no se puede autorizar. |
| `productos.nombre`, `precio`, `existencias`, `imagen`, `id_categoria` | CU-12 exige todos estos datos para publicar un producto. La imagen es obligatoria por decisión del equipo (el catálogo la muestra siempre). |
| `pedidos.envio_*` (las 5 columnas) | Sin dirección completa el pedido no se puede entregar (CU-08). |
| `pedidos.numero_pedido` | Todo pedido debe tener su código; lo garantiza el trigger. |
| `detalle_pedido.cantidad`, `precio_unitario` | Sin ellos no se puede calcular el total ni demostrar lo cobrado. |
| `pagos.medio_pago`, `ultimos4`, `valor`, `estado` | Es el registro mínimo de una transacción. |
| Todas las FK | Un hijo sin padre es un registro huérfano (un ítem sin carrito, un pago sin pedido). |
| `created_at` (todas) | Siempre se conoce el momento de creación; tiene `DEFAULT CURRENT_TIMESTAMP`. |

**Las únicas columnas que admiten NULL, y por qué:**

- `productos.descripcion`: es opcional. Un producto puede publicarse solo con nombre, precio e imagen.
- `tokens_recuperacion.usado_en`: `NULL` **significa** "todavía no se ha usado". Es información, no un dato faltante.

### 3.2 `CHECK`: reglas de negocio en la base

| Restricción | Regla | Por qué |
|---|---|---|
| `CHECK (precio > 0)` | Productos | No se vende nada gratis ni a precio negativo. |
| `CHECK (existencias >= 0)` | Productos | No puede haber stock negativo. Es la **última barrera**: aunque el código falle, la base rechaza vender más de lo que hay. |
| `CHECK (cantidad >= 1)` | `carrito_items`, `detalle_pedido` | Una línea con 0 unidades no tiene sentido: se elimina, no se guarda en 0 (CU-05). |
| `CHECK (precio_unitario > 0)` | `detalle_pedido` | Coherente con el precio del producto. |
| `CHECK (valor > 0)` | `pagos` | Un pago de 0 o negativo no es un pago. |
| `CHECK (ultimos4 ~ '^[0-9]{4}$')` | `pagos` | Exactamente 4 dígitos. Por seguridad nunca se guarda el número completo de la tarjeta o la cuenta (R5). |
| `CHECK (expira_en > created_at)` | `tokens_recuperacion` | Un token no puede nacer vencido. |

**Por qué en la base y no solo en el backend:** el backend valida primero, para dar mensajes claros, pero la base es la que **garantiza** la regla ante cualquier error del código o inserción manual.

### 3.3 `UNIQUE`: valores que no se repiten

| Restricción | Por qué |
|---|---|
| `UNIQUE (lower(email))` en usuarios | Un correo identifica una sola cuenta, sin importar las mayúsculas (CU-09). |
| `UNIQUE (lower(nombre))` en categorias | Evita "Accesorios" y "accesorios" como dos categorías. |
| `UNIQUE (id_categoria, lower(nombre))` en productos | Criterio de "producto duplicado" de CU-12. |
| `UNIQUE (id_usuario)` en carritos | **Un carrito por cliente.** Es lo que hace que la relación sea 1:1. |
| `UNIQUE (id_carrito, id_producto)` en carrito_items | Un producto aparece una sola vez por carrito; se suman cantidades (R2). |
| `UNIQUE (id_pedido, id_producto)` en detalle_pedido | Un producto aparece una sola vez por pedido. |
| `UNIQUE (numero_pedido)` en pedidos | El código del pedido identifica una sola compra. |
| `UNIQUE (token_hash)` en tokens_recuperacion | Cada token es irrepetible, y el índice permite buscarlo rápido al restablecer. |
| `UNIQUE (id_pedido) WHERE estado = 'aprobado'` en pagos | **Índice parcial:** un pedido puede tener varios pagos rechazados, pero **solo uno aprobado**. Impide cobrar dos veces. |

> En el diccionario, los `UNIQUE` compuestos de `carrito_items` y `detalle_pedido` aparecen en la fila de `created_at`. Son restricciones **de tabla** (abarcan dos columnas), no de esa columna. Si te preguntan, explícalo así.

### 3.4 Llaves foráneas y política de borrado

**Criterio general:**
- **`ON DELETE CASCADE`:** el hijo no tiene sentido sin el padre **y** no es información histórica. Si se borra el padre, se borran los hijos.
- **`ON DELETE RESTRICT`:** el hijo es historia del negocio (ventas, pagos) o el padre es un dato maestro. La base **impide** borrar el padre mientras tenga hijos.
- **`ON UPDATE CASCADE` en todas:** si una PK cambiara, sus referencias se actualizan solas. En la práctica las PK `IDENTITY` no cambian; es una protección coherente.

| FK | Política | Por qué |
|---|---|---|
| `productos.id_categoria → categorias` | **RESTRICT** | No se puede borrar una categoría que tiene productos; quedarían productos sin clasificar. Primero hay que reubicarlos. |
| `carritos.id_usuario → usuarios` | **CASCADE** | El carrito es temporal y pertenece al usuario. Sin usuario no sirve. |
| `carrito_items.id_carrito → carritos` | **CASCADE** | Los ítems son parte del carrito: si el carrito se elimina, sus ítems también. |
| `carrito_items.id_producto → productos` | **RESTRICT** | Un producto no se borra mientras esté en carritos. Además, los productos nunca se borran sino que se **inactivan** (CU-14), y el carrito avisa que ya no está disponible (D4). |
| `pedidos.id_usuario → usuarios` | **RESTRICT** | Los pedidos son historia de ventas y evidencia comercial. No se puede borrar un cliente que compró; se **desactiva** su cuenta (`estado = 'inactivo'`). |
| `detalle_pedido.id_pedido → pedidos` | **RESTRICT** | El detalle es la prueba de qué se vendió. Los pedidos no se borran. |
| `detalle_pedido.id_producto → productos` | **RESTRICT** | Borrar un producto vendido dejaría pedidos con líneas vacías y dañaría los reportes de más vendidos. |
| `pagos.id_pedido → pedidos` | **RESTRICT** | Los pagos son registros financieros; nunca deben desaparecer en cadena. |
| `tokens_recuperacion.id_usuario → usuarios` | **CASCADE** | Un token sin usuario no tiene uso, y no es información histórica que convenga conservar. |

**Consecuencia del diseño (útil para sustentar):**
- La combinación de `RESTRICT` en la historia con el **borrado lógico** (`estado`) en usuarios y productos hace que **ninguna venta pueda perder sus datos**.
- Un usuario con pedidos no se puede borrar físicamente: se desactiva.
- Un usuario sin pedidos sí se puede borrar, y sus datos temporales (carrito, ítems y tokens) se van con él por `CASCADE`.

### 3.5 Tipos de dato elegidos

| Tipo | Dónde | Por qué |
|---|---|---|
| `NUMERIC(10,2)` / `NUMERIC(12,2)` | Precios / valor del pago | Dinero exacto en COP. `FLOAT` produce errores de redondeo (0,1 + 0,2 ≠ 0,3) inaceptables en montos. El pago tiene más dígitos porque puede sumar varios productos. |
| `TIMESTAMPTZ` | Todas las fechas | Guarda el instante con zona horaria. Evita confusiones entre la hora del servidor y la de Colombia en reportes y vencimientos de tokens. |
| `VARCHAR(n)` | Textos con límite | Limita el tamaño según el dato real: email 150, nombres 100–150, dirección 255. |
| `TEXT` | `descripcion` | Texto libre de longitud variable. |
| `VARCHAR(255)` | `imagen` | Solo el **nombre del archivo**. La imagen vive en disco: guardarla en la base la haría pesada y lenta. |
| `CHAR(4)` | `ultimos4` | Longitud fija y exacta. |
| `CHAR(64)` | `token_hash` | Un SHA-256 en hexadecimal siempre mide 64 caracteres. Se usa SHA-256 y no bcrypt porque el token se **busca** por su hash, y bcrypt genera un hash distinto cada vez. |
| `VARCHAR(255)` | `password` | Hash bcrypt (60 caracteres), con margen por si se cambia de algoritmo. Nunca se guarda la contraseña en texto. |

---

## Detalles a corregir en los entregables visuales

Encontré dos inconsistencias menores entre los documentos y el DDL:

1. **ER (`BikeStore_MER-ER.pdf`), tabla `productos`:** dice `existencia`, pero la columna real es `existencias`.
2. **Diccionario:** los `UNIQUE` compuestos (`id_carrito, id_producto` e `id_pedido, id_producto`) aparecen en la fila de `created_at`. Conviene moverlos a una nota de "restricciones de tabla" debajo de cada tabla.

// Acceso a datos de `pedidos` y `detalle_pedido` (CU-03 a CU-08; R2, R3, R4).
// El carrito es un pedido con estado 'carrito' (migraciones 004 y 005): sus líneas son filas de detalle_pedido.
const pool = require('../config/db');
const { patronContiene } = require('../utils/like');

const SELECT_PEDIDO = `
  SELECT pe.id_pedido, pe.numero_pedido, pe.id_usuario, pe.estado,
         pe.envio_nombre, pe.envio_telefono, pe.envio_departamento, pe.envio_ciudad, pe.envio_direccion,
         pe.fecha_pedido, pe.created_at,
         COALESCE((SELECT SUM(d.cantidad * d.precio_unitario)
                   FROM detalle_pedido d WHERE d.id_pedido = pe.id_pedido), 0) AS total
  FROM pedidos pe`;

// ---------- Carrito (pedido en estado 'carrito') ----------

// Busca el carrito del cliente SIN crearlo (GET /carrito no escribe en la base).
async function buscarCarrito(idUsuario, db = pool) {
  const { rows } = await db.query(
    `SELECT id_pedido FROM pedidos WHERE id_usuario = $1 AND estado = 'carrito'`,
    [idUsuario]
  );
  return rows[0]?.id_pedido ?? null;
}

// Un carrito por cliente (índice único parcial uq_pedidos_carrito_usuario): lo crea la primera vez.
// ON CONFLICT repite el predicado del índice parcial para que PostgreSQL lo reconozca.
// Dentro de una transacción, el DO UPDATE deja la fila del carrito BLOQUEADA hasta el final:
// así una confirmación simultánea espera (o, si confirmó antes, se crea un carrito nuevo).
async function obtenerOCrearCarrito(idUsuario, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO pedidos (id_usuario) VALUES ($1)
     ON CONFLICT (id_usuario) WHERE estado = 'carrito'
     DO UPDATE SET id_usuario = EXCLUDED.id_usuario
     RETURNING id_pedido`,
    [idUsuario]
  );
  return rows[0].id_pedido;
}

// Bloquea el carrito del cliente (FOR UPDATE) para modificarlo o confirmarlo sin carreras.
// Si otra transacción lo confirma mientras se espera el bloqueo, PostgreSQL vuelve a evaluar
// estado = 'carrito' sobre la fila nueva y no la devuelve: se trata como "no hay carrito".
async function bloquearCarrito(idUsuario, db = pool) {
  const { rows } = await db.query(
    `SELECT id_pedido FROM pedidos WHERE id_usuario = $1 AND estado = 'carrito' FOR UPDATE`,
    [idUsuario]
  );
  return rows[0]?.id_pedido ?? null;
}

// Líneas con el estado ACTUAL del producto (precio, existencias, estado) para CU-04/CU-06/CU-07.
async function listarLineasCarrito(idPedido, db = pool) {
  const { rows } = await db.query(
    `SELECT d.id_producto, p.nombre, p.imagen, p.precio, p.existencias, p.estado,
            d.cantidad
     FROM detalle_pedido d
     JOIN productos p ON p.id_producto = d.id_producto
     WHERE d.id_pedido = $1
     ORDER BY d.created_at, d.id_detalle_pedido`,
    [idPedido]
  );
  return rows;
}

async function cantidadEnCarrito(idPedido, idProducto, db = pool) {
  const { rows } = await db.query(
    'SELECT cantidad FROM detalle_pedido WHERE id_pedido = $1 AND id_producto = $2',
    [idPedido, idProducto]
  );
  return rows[0]?.cantidad ?? 0;
}

// R2: si el producto ya está, se suman las cantidades (UNIQUE id_pedido + id_producto).
// precio_unitario se guarda con el precio vigente; al confirmar se vuelve a refrescar (R3).
async function sumarLineaCarrito(idPedido, idProducto, cantidad, precio, db = pool) {
  await db.query(
    `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id_pedido, id_producto)
     DO UPDATE SET cantidad = detalle_pedido.cantidad + EXCLUDED.cantidad`,
    [idPedido, idProducto, cantidad, precio]
  );
}

async function fijarCantidadCarrito(idPedido, idProducto, cantidad, db = pool) {
  const { rowCount } = await db.query(
    'UPDATE detalle_pedido SET cantidad = $3 WHERE id_pedido = $1 AND id_producto = $2',
    [idPedido, idProducto, cantidad]
  );
  return rowCount;
}

// Vaciar o quitar líneas del carrito borra filas de detalle_pedido, nunca el pedido (ON DELETE RESTRICT).
async function eliminarLineaCarrito(idPedido, idProducto, db = pool) {
  const { rowCount } = await db.query(
    'DELETE FROM detalle_pedido WHERE id_pedido = $1 AND id_producto = $2',
    [idPedido, idProducto]
  );
  return rowCount;
}

// R3: al confirmar, el precio de cada línea pasa a ser el precio vigente del producto.
async function refrescarPrecios(idPedido, db = pool) {
  await db.query(
    `UPDATE detalle_pedido d SET precio_unitario = p.precio
     FROM productos p
     WHERE p.id_producto = d.id_producto AND d.id_pedido = $1`,
    [idPedido]
  );
}

// CU-07/CU-08: un solo UPDATE carrito -> pendiente. El trigger trg_pedidos_numero asigna
// fecha_pedido y numero_pedido; el CHECK ck_pedidos_confirmado exige los datos de envío.
async function confirmarCarrito(idPedido, envio, db = pool) {
  const { rows } = await db.query(
    `UPDATE pedidos
     SET estado = 'pendiente',
         envio_nombre = $2, envio_telefono = $3, envio_departamento = $4,
         envio_ciudad = $5, envio_direccion = $6
     WHERE id_pedido = $1 AND estado = 'carrito'
     RETURNING id_pedido, numero_pedido, fecha_pedido`,
    [
      idPedido,
      envio.envio_nombre,
      envio.envio_telefono,
      envio.envio_departamento,
      envio.envio_ciudad,
      envio.envio_direccion
    ]
  );
  return rows[0] || null;
}

// ---------- Pedidos confirmados ----------

async function findById(idPedido, db = pool) {
  const { rows } = await db.query(`${SELECT_PEDIDO} WHERE pe.id_pedido = $1`, [idPedido]);
  return rows[0] || null;
}

// Un carrito no tiene número (NULL), así que nunca se encuentra por número.
async function findByNumero(numero, db = pool) {
  const { rows } = await db.query(`${SELECT_PEDIDO} WHERE pe.numero_pedido = $1`, [numero]);
  return rows[0] || null;
}

// Bloquea el pedido para que no se procesen dos pagos a la vez.
async function bloquear(idPedido, db = pool) {
  const { rows } = await db.query(
    'SELECT id_pedido, id_usuario, estado, numero_pedido FROM pedidos WHERE id_pedido = $1 FOR UPDATE',
    [idPedido]
  );
  return rows[0] || null;
}

// "Mis pedidos": solo los confirmados (el carrito se consulta en /carrito).
async function listarPorUsuario(idUsuario, db = pool) {
  const { rows } = await db.query(
    `${SELECT_PEDIDO} WHERE pe.id_usuario = $1 AND pe.estado <> 'carrito'
     ORDER BY pe.fecha_pedido DESC`,
    [idUsuario]
  );
  return rows;
}

// Decisión N (B4): pedidos confirmados de todos los clientes para el admin (nunca carritos).
// q busca "contiene" en número, nombre y correo; desde/hasta filtran fecha_pedido como el tablero.
const LIMITE_ADMIN = 200;
async function listarAdmin({ q, estado, desde, hasta }, db = pool) {
  const valores = [];
  const condiciones = ["pe.estado <> 'carrito'"];
  if (q) {
    valores.push(patronContiene(q));
    const i = valores.length;
    condiciones.push(`(pe.numero_pedido ILIKE $${i} OR u.nombre ILIKE $${i} OR u.email ILIKE $${i})`);
  }
  if (estado) {
    valores.push(estado);
    condiciones.push(`pe.estado = $${valores.length}`);
  }
  if (desde) {
    valores.push(desde);
    condiciones.push(`pe.fecha_pedido >= $${valores.length}::date`);
  }
  if (hasta) {
    valores.push(hasta);
    condiciones.push(`pe.fecha_pedido < ($${valores.length}::date + 1)`);
  }
  valores.push(LIMITE_ADMIN);
  const { rows } = await db.query(
    `SELECT pe.id_pedido, pe.numero_pedido, pe.id_usuario, pe.estado,
            pe.envio_nombre, pe.envio_telefono, pe.envio_departamento, pe.envio_ciudad, pe.envio_direccion,
            pe.fecha_pedido, pe.created_at,
            u.nombre AS cliente_nombre, u.email AS cliente_email,
            COALESCE(SUM(d.cantidad * d.precio_unitario), 0) AS total,
            COALESCE(SUM(d.cantidad), 0)::int AS unidades
     FROM pedidos pe
     JOIN usuarios u ON u.id_usuario = pe.id_usuario
     LEFT JOIN detalle_pedido d ON d.id_pedido = pe.id_pedido
     WHERE ${condiciones.join(' AND ')}
     GROUP BY pe.id_pedido, u.id_usuario
     ORDER BY pe.fecha_pedido DESC, pe.id_pedido DESC
     LIMIT $${valores.length}`,
    valores
  );
  return rows;
}

async function listarDetalle(idPedido, db = pool) {
  const { rows } = await db.query(
    `SELECT d.id_producto, p.nombre, d.cantidad, d.precio_unitario,
            d.cantidad * d.precio_unitario AS subtotal
     FROM detalle_pedido d
     JOIN productos p ON p.id_producto = d.id_producto
     WHERE d.id_pedido = $1
     ORDER BY d.id_detalle_pedido`,
    [idPedido]
  );
  return rows;
}

async function calcularTotal(idPedido, db = pool) {
  const { rows } = await db.query(
    'SELECT COALESCE(SUM(cantidad * precio_unitario), 0) AS total FROM detalle_pedido WHERE id_pedido = $1',
    [idPedido]
  );
  return rows[0].total;
}

async function actualizarEstado(idPedido, estado, db = pool) {
  await db.query('UPDATE pedidos SET estado = $2 WHERE id_pedido = $1', [idPedido, estado]);
}

module.exports = {
  buscarCarrito,
  obtenerOCrearCarrito,
  bloquearCarrito,
  listarLineasCarrito,
  cantidadEnCarrito,
  sumarLineaCarrito,
  fijarCantidadCarrito,
  eliminarLineaCarrito,
  refrescarPrecios,
  confirmarCarrito,
  findById,
  findByNumero,
  bloquear,
  listarPorUsuario,
  listarAdmin,
  listarDetalle,
  calcularTotal,
  actualizarEstado
};

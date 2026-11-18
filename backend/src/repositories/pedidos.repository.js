// Acceso a datos de `pedidos` y `detalle_pedido` (CU-07, CU-08; R3, R4).
const pool = require('../config/db');

const SELECT_PEDIDO = `
  SELECT pe.id_pedido, pe.numero_pedido, pe.id_usuario, pe.estado,
         pe.envio_nombre, pe.envio_telefono, pe.envio_departamento, pe.envio_ciudad, pe.envio_direccion,
         pe.created_at,
         COALESCE((SELECT SUM(d.cantidad * d.precio_unitario)
                   FROM detalle_pedido d WHERE d.id_pedido = pe.id_pedido), 0) AS total
  FROM pedidos pe`;

// numero_pedido NO se envía: lo asigna el trigger trg_pedidos_numero y se lee del RETURNING.
async function crear(idUsuario, envio, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO pedidos (id_usuario, envio_nombre, envio_telefono, envio_departamento, envio_ciudad, envio_direccion)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_pedido, numero_pedido, created_at`,
    [
      idUsuario,
      envio.envio_nombre,
      envio.envio_telefono,
      envio.envio_departamento,
      envio.envio_ciudad,
      envio.envio_direccion
    ]
  );
  return rows[0];
}

// R3: precio_unitario es la copia del precio del producto en el momento de crear el pedido.
async function insertarDetalle(idPedido, items, db = pool) {
  const valores = [];
  const filas = items.map((item, i) => {
    valores.push(idPedido, item.id_producto, item.cantidad, item.precio);
    const b = i * 4;
    return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`;
  });
  await db.query(
    `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario)
     VALUES ${filas.join(', ')}`,
    valores
  );
}

async function findById(idPedido, db = pool) {
  const { rows } = await db.query(`${SELECT_PEDIDO} WHERE pe.id_pedido = $1`, [idPedido]);
  return rows[0] || null;
}

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

async function listarPorUsuario(idUsuario, db = pool) {
  const { rows } = await db.query(
    `${SELECT_PEDIDO} WHERE pe.id_usuario = $1 ORDER BY pe.created_at DESC`,
    [idUsuario]
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
  crear,
  insertarDetalle,
  findById,
  findByNumero,
  bloquear,
  listarPorUsuario,
  listarDetalle,
  calcularTotal,
  actualizarEstado
};

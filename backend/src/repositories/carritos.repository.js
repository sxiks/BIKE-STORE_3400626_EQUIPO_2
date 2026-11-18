// Acceso a datos de `carritos` y `carrito_items` (CU-03 a CU-07; R2).
const pool = require('../config/db');

// Un carrito por cliente: lo crea la primera vez que se necesita.
async function obtenerOCrear(idUsuario, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO carritos (id_usuario) VALUES ($1)
     ON CONFLICT (id_usuario) DO UPDATE SET id_usuario = EXCLUDED.id_usuario
     RETURNING id_carrito`,
    [idUsuario]
  );
  return rows[0].id_carrito;
}

// Ítems con el estado ACTUAL del producto (precio, existencias, estado) para CU-04/CU-06/CU-07.
async function listarItems(idCarrito, db = pool) {
  const { rows } = await db.query(
    `SELECT ci.id_producto, p.nombre, p.imagen, p.precio, p.existencias, p.estado,
            ci.cantidad
     FROM carrito_items ci
     JOIN productos p ON p.id_producto = ci.id_producto
     WHERE ci.id_carrito = $1
     ORDER BY ci.created_at, ci.id_carrito_item`,
    [idCarrito]
  );
  return rows;
}

async function cantidadDe(idCarrito, idProducto, db = pool) {
  const { rows } = await db.query(
    'SELECT cantidad FROM carrito_items WHERE id_carrito = $1 AND id_producto = $2',
    [idCarrito, idProducto]
  );
  return rows[0]?.cantidad ?? 0;
}

// R2: si el producto ya está, se suman las cantidades (nunca hay líneas duplicadas).
async function sumarItem(idCarrito, idProducto, cantidad, db = pool) {
  await db.query(
    `INSERT INTO carrito_items (id_carrito, id_producto, cantidad)
     VALUES ($1, $2, $3)
     ON CONFLICT (id_carrito, id_producto)
     DO UPDATE SET cantidad = carrito_items.cantidad + EXCLUDED.cantidad`,
    [idCarrito, idProducto, cantidad]
  );
}

async function fijarCantidad(idCarrito, idProducto, cantidad, db = pool) {
  const { rowCount } = await db.query(
    'UPDATE carrito_items SET cantidad = $3 WHERE id_carrito = $1 AND id_producto = $2',
    [idCarrito, idProducto, cantidad]
  );
  return rowCount;
}

async function eliminarItem(idCarrito, idProducto, db = pool) {
  const { rowCount } = await db.query(
    'DELETE FROM carrito_items WHERE id_carrito = $1 AND id_producto = $2',
    [idCarrito, idProducto]
  );
  return rowCount;
}

async function vaciarPorUsuario(idUsuario, db = pool) {
  await db.query(
    `DELETE FROM carrito_items
     WHERE id_carrito = (SELECT id_carrito FROM carritos WHERE id_usuario = $1)`,
    [idUsuario]
  );
}

module.exports = {
  obtenerOCrear,
  listarItems,
  cantidadDe,
  sumarItem,
  fijarCantidad,
  eliminarItem,
  vaciarPorUsuario
};

// Acceso a datos de `producto_imagenes`: la galería de cada producto (B2.2, migración 006).
// La portada NO está aquí: sigue en productos.imagen.
const pool = require('../config/db');

async function listarPorProducto(idProducto, db = pool) {
  const { rows } = await db.query(
    `SELECT id_imagen, imagen, orden FROM producto_imagenes
     WHERE id_producto = $1
     ORDER BY orden, id_imagen`,
    [idProducto]
  );
  return rows;
}

async function findDeProducto(idProducto, idImagen, db = pool) {
  const { rows } = await db.query(
    'SELECT id_imagen, imagen, orden FROM producto_imagenes WHERE id_producto = $1 AND id_imagen = $2',
    [idProducto, idImagen]
  );
  return rows[0] || null;
}

// Agrega al final de la galería.
async function create(idProducto, imagen, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO producto_imagenes (id_producto, imagen, orden)
     VALUES ($1, $2, COALESCE((SELECT max(orden) FROM producto_imagenes WHERE id_producto = $1), 0) + 1)
     RETURNING id_imagen`,
    [idProducto, imagen]
  );
  return rows[0].id_imagen;
}

async function remove(idImagen, db = pool) {
  const { rowCount } = await db.query('DELETE FROM producto_imagenes WHERE id_imagen = $1', [idImagen]);
  return rowCount;
}

async function cambiarArchivo(idImagen, imagen, db = pool) {
  await db.query('UPDATE producto_imagenes SET imagen = $2 WHERE id_imagen = $1', [idImagen, imagen]);
}

// ids en el orden nuevo: el primero queda con orden 1, el segundo con 2, etc. (un solo UPDATE).
async function reordenar(idProducto, ids, db = pool) {
  await db.query(
    `UPDATE producto_imagenes pi
     SET orden = nuevo.posicion
     FROM unnest($2::int[]) WITH ORDINALITY AS nuevo(id_imagen, posicion)
     WHERE pi.id_imagen = nuevo.id_imagen AND pi.id_producto = $1`,
    [idProducto, ids]
  );
}

module.exports = { listarPorProducto, findDeProducto, create, remove, cambiarArchivo, reordenar };

// Acceso a datos de `categorias` (CU-02, CU-12, CU-17 y la gestión de categorías de B2.2).
const pool = require('../config/db');

// Categoría con cuántos productos tiene (activos e inactivos): decide si se puede eliminar (decisión M).
const SELECT_ADMIN = `
  SELECT c.id_categoria, c.nombre, count(p.id_producto)::int AS total_productos
  FROM categorias c
  LEFT JOIN productos p ON p.id_categoria = c.id_categoria`;

async function findAll(db = pool) {
  const { rows } = await db.query(
    'SELECT id_categoria, nombre FROM categorias ORDER BY nombre'
  );
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(
    'SELECT id_categoria, nombre FROM categorias WHERE id_categoria = $1',
    [id]
  );
  return rows[0] || null;
}

async function findAllAdmin(db = pool) {
  const { rows } = await db.query(`${SELECT_ADMIN} GROUP BY c.id_categoria ORDER BY c.nombre`);
  return rows;
}

async function findByIdAdmin(id, db = pool) {
  const { rows } = await db.query(`${SELECT_ADMIN} WHERE c.id_categoria = $1 GROUP BY c.id_categoria`, [id]);
  return rows[0] || null;
}

async function create(nombre, db = pool) {
  const { rows } = await db.query(
    'INSERT INTO categorias (nombre) VALUES ($1) RETURNING id_categoria',
    [nombre]
  );
  return rows[0].id_categoria;
}

async function update(id, nombre, db = pool) {
  const { rowCount } = await db.query(
    'UPDATE categorias SET nombre = $2 WHERE id_categoria = $1',
    [id, nombre]
  );
  return rowCount;
}

async function remove(id, db = pool) {
  const { rowCount } = await db.query('DELETE FROM categorias WHERE id_categoria = $1', [id]);
  return rowCount;
}

module.exports = { findAll, findById, findAllAdmin, findByIdAdmin, create, update, remove };

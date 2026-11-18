// Acceso a datos de `categorias` (CU-02, CU-12, CU-17).
const pool = require('../config/db');

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

module.exports = { findAll, findById };

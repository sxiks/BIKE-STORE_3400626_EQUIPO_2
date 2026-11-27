// Acceso a datos de `usuarios`. El correo se compara siempre con lower() (índice uq_usuarios_email).
const pool = require('../config/db');

const COLUMNAS_PUBLICAS = 'id_usuario, nombre, email, rol, estado, created_at';

async function findByEmail(email, db = pool) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS_PUBLICAS}, password FROM usuarios WHERE lower(email) = lower($1)`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id_usuario = $1`,
    [id]
  );
  return rows[0] || null;
}

async function existsByEmail(email, db = pool) {
  const { rowCount } = await db.query(
    'SELECT 1 FROM usuarios WHERE lower(email) = lower($1)',
    [email]
  );
  return rowCount > 0;
}

async function create({ nombre, email, passwordHash, rol }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO usuarios (nombre, email, password, rol)
     VALUES ($1, $2, $3, $4)
     RETURNING id_usuario`,
    [nombre, email, passwordHash, rol]
  );
  return rows[0].id_usuario;
}

// En un patrón LIKE/ILIKE, % y _ son comodines y \ es el carácter de escape (el predeterminado de PostgreSQL).
// Se escapan para que q se busque como texto literal ("contiene"), no como patrón.
function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// CU-19: búsqueda por nombre o correo, con filtros opcionales.
async function buscar({ q, rol, estado }, db = pool) {
  const condiciones = [];
  const valores = [];

  if (q) {
    valores.push(`%${escaparLike(q)}%`);
    condiciones.push(`(nombre ILIKE $${valores.length} OR email ILIKE $${valores.length})`);
  }
  if (rol) {
    valores.push(rol);
    condiciones.push(`rol = $${valores.length}`);
  }
  if (estado) {
    valores.push(estado);
    condiciones.push(`estado = $${valores.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios ${where} ORDER BY nombre`,
    valores
  );
  return rows;
}

async function updateRol(id, rol, db = pool) {
  const { rows } = await db.query(
    `UPDATE usuarios SET rol = $2 WHERE id_usuario = $1 RETURNING ${COLUMNAS_PUBLICAS}`,
    [id, rol]
  );
  return rows[0] || null;
}

async function updateEstado(id, estado, db = pool) {
  const { rows } = await db.query(
    `UPDATE usuarios SET estado = $2 WHERE id_usuario = $1 RETURNING ${COLUMNAS_PUBLICAS}`,
    [id, estado]
  );
  return rows[0] || null;
}

async function updatePassword(id, passwordHash, db = pool) {
  await db.query('UPDATE usuarios SET password = $2 WHERE id_usuario = $1', [id, passwordHash]);
}

module.exports = {
  findByEmail,
  findById,
  existsByEmail,
  create,
  buscar,
  updateRol,
  updateEstado,
  updatePassword
};

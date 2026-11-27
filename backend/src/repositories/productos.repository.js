// Acceso a datos de `productos` (CU-01, CU-02, CU-08, CU-12 a CU-15).
const pool = require('../config/db');
const { patronContiene } = require('../utils/like');

const SELECT_PRODUCTO = `
  SELECT p.id_producto, p.id_categoria, c.nombre AS categoria, p.nombre, p.descripcion,
         p.precio, p.existencias, p.imagen, p.estado, p.created_at,
         (p.estado = 'activo' AND p.existencias > 0) AS disponible
  FROM productos p
  JOIN categorias c ON c.id_categoria = p.id_categoria`;

// Lista cerrada: el orden nunca se arma con texto del usuario.
const ORDENES = {
  precio_asc: 'p.precio ASC, p.id_producto',
  precio_desc: 'p.precio DESC, p.id_producto',
  nombre: 'p.nombre ASC'
};

// CU-01 / CU-02: catálogo público, solo productos activos.
async function listarCatalogo({ idCategoria, orden }, db = pool) {
  const valores = [];
  let where = "WHERE p.estado = 'activo'";
  if (idCategoria) {
    valores.push(idCategoria);
    where += ` AND p.id_categoria = $${valores.length}`;
  }
  const { rows } = await db.query(
    `${SELECT_PRODUCTO} ${where} ORDER BY ${ORDENES[orden] || ORDENES.nombre}`,
    valores
  );
  return rows;
}

// CU-15: listado del panel de administración (incluye inactivos).
async function listarAdmin({ q, idCategoria, estado }, db = pool) {
  const condiciones = [];
  const valores = [];
  if (q) {
    valores.push(patronContiene(q)); // % y _ del usuario se buscan como texto (B2.1)
    condiciones.push(`p.nombre ILIKE $${valores.length}`);
  }
  if (idCategoria) {
    valores.push(idCategoria);
    condiciones.push(`p.id_categoria = $${valores.length}`);
  }
  if (estado) {
    valores.push(estado);
    condiciones.push(`p.estado = $${valores.length}`);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await db.query(`${SELECT_PRODUCTO} ${where} ORDER BY p.nombre`, valores);
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`${SELECT_PRODUCTO} WHERE p.id_producto = $1`, [id]);
  return rows[0] || null;
}

async function create({ idCategoria, nombre, descripcion, precio, existencias, imagen }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO productos (id_categoria, nombre, descripcion, precio, existencias, imagen)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_producto`,
    [idCategoria, nombre, descripcion, precio, existencias, imagen]
  );
  return rows[0].id_producto;
}

async function update(id, { idCategoria, nombre, descripcion, precio, existencias, imagen }, db = pool) {
  const { rowCount } = await db.query(
    `UPDATE productos
     SET id_categoria = $2, nombre = $3, descripcion = $4, precio = $5, existencias = $6, imagen = $7
     WHERE id_producto = $1`,
    [id, idCategoria, nombre, descripcion, precio, existencias, imagen]
  );
  return rowCount;
}

async function updateEstado(id, estado, db = pool) {
  const { rowCount } = await db.query(
    'UPDATE productos SET estado = $2 WHERE id_producto = $1',
    [id, estado]
  );
  return rowCount;
}

// Pago (decisión 10): bloquea las filas en orden de id para evitar deadlocks.
async function bloquearPorIds(ids, db = pool) {
  const { rows } = await db.query(
    `SELECT id_producto, nombre, existencias, estado FROM productos
     WHERE id_producto = ANY($1::int[])
     ORDER BY id_producto
     FOR UPDATE`,
    [ids]
  );
  return rows;
}

// Devuelve 1 si descontó, 0 si no había existencias suficientes.
async function descontarExistencias(id, cantidad, db = pool) {
  const { rowCount } = await db.query(
    `UPDATE productos SET existencias = existencias - $2
     WHERE id_producto = $1 AND existencias >= $2`,
    [id, cantidad]
  );
  return rowCount;
}

module.exports = {
  listarCatalogo,
  listarAdmin,
  findById,
  create,
  update,
  updateEstado,
  bloquearPorIds,
  descontarExistencias
};

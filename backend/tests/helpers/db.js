// Utilidades de base de datos para las pruebas. Las pruebas pueden usar SQL directo
// para PREPARAR datos (la regla de capas aplica al código de src/, no a tests/).
const pool = require('../../src/config/db');

// Borra usuarios y todo lo que depende de ellos (tokens, pedidos —incluidos los carritos—, detalle y pagos).
// Categorías y productos de la semilla se conservan.
async function limpiarUsuarios() {
  await pool.query('TRUNCATE usuarios RESTART IDENTITY CASCADE');
}

async function cambiarEstadoUsuario(email, estado) {
  await pool.query('UPDATE usuarios SET estado = $1 WHERE lower(email) = lower($2)', [estado, email]);
}

async function cambiarRolUsuario(email, rol) {
  await pool.query('UPDATE usuarios SET rol = $1 WHERE lower(email) = lower($2)', [rol, email]);
}

// Simula que pasaron los minutos de vigencia (created_at también retrocede por ck_tokens_expira).
async function vencerTokensDe(email) {
  await pool.query(
    `UPDATE tokens_recuperacion
        SET created_at = CURRENT_TIMESTAMP - INTERVAL '2 hours',
            expira_en  = CURRENT_TIMESTAMP - INTERVAL '1 minute'
      WHERE id_usuario = (SELECT id_usuario FROM usuarios WHERE lower(email) = lower($1))`,
    [email]
  );
}

// Productos: foto de la tabla para dejarla igual después de cada prueba (B2.1).
// Las pruebas crean, editan e inactivan productos; los de la semilla vuelven a sus valores
// y los creados por las pruebas se borran. Llamar después de limpiarUsuarios (los pedidos ya no existen).
async function fotoProductos() {
  const { rows } = await pool.query(
    'SELECT id_producto, id_categoria, nombre, descripcion, precio, existencias, imagen, estado FROM productos'
  );
  return rows;
}

async function restaurarProductos(foto) {
  const ids = foto.map((p) => p.id_producto);
  await pool.query('DELETE FROM productos WHERE NOT (id_producto = ANY($1::int[]))', [ids]);
  for (const p of foto) {
    await pool.query(
      `UPDATE productos SET id_categoria = $2, nombre = $3, descripcion = $4, precio = $5,
              existencias = $6, imagen = $7, estado = $8 WHERE id_producto = $1`,
      [p.id_producto, p.id_categoria, p.nombre, p.descripcion, p.precio, p.existencias, p.imagen, p.estado]
    );
  }
}

async function productoPorId(id) {
  const { rows } = await pool.query('SELECT * FROM productos WHERE id_producto = $1', [id]);
  return rows[0] || null;
}

module.exports = {
  pool,
  limpiarUsuarios,
  cambiarEstadoUsuario,
  cambiarRolUsuario,
  vencerTokensDe,
  fotoProductos,
  restaurarProductos,
  productoPorId
};

// Utilidades de base de datos para las pruebas. Las pruebas pueden usar SQL directo
// para PREPARAR datos (la regla de capas aplica al código de src/, no a tests/).
const pool = require('../../src/config/db');

// Borra usuarios y todo lo que depende de ellos (tokens, carritos, pedidos, pagos).
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

module.exports = { pool, limpiarUsuarios, cambiarEstadoUsuario, cambiarRolUsuario, vencerTokensDe };

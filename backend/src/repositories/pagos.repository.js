// Acceso a datos de `pagos` (CU-08; R5: nunca números completos, solo los últimos 4).
const pool = require('../config/db');

async function crear({ idPedido, medioPago, ultimos4, valor, estado }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO pagos (id_pedido, medio_pago, ultimos4, valor, estado)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_pago, medio_pago, ultimos4, valor, estado, created_at`,
    [idPedido, medioPago, ultimos4, valor, estado]
  );
  return rows[0];
}

async function listarPorPedido(idPedido, db = pool) {
  const { rows } = await db.query(
    `SELECT id_pago, medio_pago, ultimos4, valor, estado, created_at
     FROM pagos WHERE id_pedido = $1 ORDER BY created_at`,
    [idPedido]
  );
  return rows;
}

module.exports = { crear, listarPorPedido };

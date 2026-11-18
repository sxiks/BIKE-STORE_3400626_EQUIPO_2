// Permite a los servicios agrupar operaciones de varios repositorios en UNA transacción
// sin importar config/db. Uso:
//   await withTransaction(async (tx) => { await repoA.algo(..., tx); await repoB.otro(..., tx); });
const pool = require('../config/db');

async function withTransaction(trabajo) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await trabajo(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { withTransaction };

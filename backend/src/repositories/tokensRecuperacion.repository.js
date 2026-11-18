// Acceso a datos de `tokens_recuperacion` (CU-11). Solo se guarda el SHA-256 del token.
const pool = require('../config/db');

// Invalida (marca como usados) los tokens vigentes del usuario antes de emitir uno nuevo.
async function invalidarActivos(idUsuario, db = pool) {
  await db.query(
    `UPDATE tokens_recuperacion SET usado_en = now()
     WHERE id_usuario = $1 AND usado_en IS NULL`,
    [idUsuario]
  );
}

// La expiración se calcula en SQL para que coincida con el reloj de la base (CHECK expira_en > created_at).
async function crear({ idUsuario, tokenHash, minutos }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO tokens_recuperacion (id_usuario, token_hash, expira_en)
     VALUES ($1, $2, now() + make_interval(mins => $3))
     RETURNING id_token, expira_en`,
    [idUsuario, tokenHash, minutos]
  );
  return rows[0];
}

// Bloquea la fila para que el mismo token no pueda usarse dos veces en paralelo.
async function buscarVigentePorHash(tokenHash, db = pool) {
  const { rows } = await db.query(
    `SELECT id_token, id_usuario FROM tokens_recuperacion
     WHERE token_hash = $1 AND usado_en IS NULL AND expira_en > now()
     FOR UPDATE`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function marcarUsado(idToken, db = pool) {
  await db.query('UPDATE tokens_recuperacion SET usado_en = now() WHERE id_token = $1', [idToken]);
}

module.exports = { invalidarActivos, crear, buscarVigentePorHash, marcarUsado };

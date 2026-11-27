const jwt = require('jsonwebtoken');
const env = require('../config/env');

function createToken(user) {
  return jwt.sign(
    {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      // Momento de la firma en milisegundos: `iat` solo tiene segundos (ver auth.middleware, H-04).
      emitido_ms: Date.now()
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

module.exports = { createToken };

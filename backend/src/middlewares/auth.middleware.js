// Seguridad: verifica el JWT y, en CADA solicitud, el estado y rol actuales en la base (CU-22, decisión G)
// y que el token no sea anterior al último restablecimiento de contraseña (H-04).
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const usuariosService = require('../services/usuarios.services');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Token requerido' });
  }

  let payload;
  try {
    payload = jwt.verify(header.substring(7), env.jwt.secret);
  } catch {
    return res.status(401).json({ ok: false, message: 'Token inválido o expirado' });
  }

  // `iat` viene en segundos: con él, un token firmado en el mismo segundo de un restablecimiento
  // quedaría sin revocar o, al revés, el login justo después se rechazaría. Por eso el token lleva
  // emitido_ms (utils/jwt.js). Los tokens firmados antes de este cambio no lo traen: se usa iat.
  const emitidoMs = Number.isFinite(payload.emitido_ms) ? payload.emitido_ms : payload.iat * 1000;

  try {
    // Rol y estado salen de la base, no del token: un cambio de rol o una desactivación aplica de inmediato.
    // Lo mismo con un restablecimiento de contraseña: los tokens emitidos antes se rechazan (H-04).
    req.user = await usuariosService.obtenerSesionActiva(payload.id_usuario, emitidoMs);
    next();
  } catch (error) {
    next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, message: 'No tienes permisos para realizar esta operación' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };

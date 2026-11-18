// Seguridad: verifica el JWT y, en CADA solicitud, el estado y rol actuales en la base (CU-22, decisión G).
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

  try {
    // Rol y estado salen de la base, no del token: un cambio de rol o una desactivación aplica de inmediato.
    req.user = await usuariosService.obtenerSesionActiva(payload.id_usuario);
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

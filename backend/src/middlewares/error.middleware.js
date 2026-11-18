// Traduce los errores a la respuesta uniforme { ok: false, message, code?, data? }.
// IMPORTANTE: nunca registra req.body (puede contener datos de pago).
const multer = require('multer');
const AppError = require('../utils/AppError');

// Códigos SQLSTATE de PostgreSQL que pueden llegar si un servicio no los tradujo antes.
const PG_ERRORES = {
  23505: { status: 409, message: 'El registro ya existe' },
  23503: { status: 409, message: 'La operación viola una relación con otro registro' },
  23514: { status: 400, message: 'Los datos no cumplen las reglas de validación' },
  '22P02': { status: 400, message: 'Formato de dato inválido' }
};

function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    const cuerpo = { ok: false, message: error.message };
    if (error.code) cuerpo.code = error.code;
    if (error.data) cuerpo.data = error.data;
    return res.status(error.status).json(cuerpo);
  }

  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera el máximo de 2 MB' : 'Error al subir la imagen';
    return res.status(400).json({ ok: false, message });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, message: 'El cuerpo de la solicitud no es JSON válido' });
  }

  const pg = PG_ERRORES[error.code];
  if (pg) {
    return res.status(pg.status).json({ ok: false, message: pg.message });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, error.message, error.stack);
  res.status(500).json({ ok: false, message: 'Error interno del servidor' });
}

module.exports = errorHandler;

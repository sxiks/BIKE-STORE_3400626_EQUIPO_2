// Formato uniforme de éxito: { ok: true, data, message? }
function ok(res, data, { status = 200, message } = {}) {
  const cuerpo = { ok: true };
  if (data !== undefined) cuerpo.data = data;
  if (message) cuerpo.message = message;
  return res.status(status).json(cuerpo);
}

module.exports = { ok };

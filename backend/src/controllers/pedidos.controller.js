const pedidosService = require('../services/pedidos.services');
const { ok } = require('../utils/respuesta');

async function crear(req, res) {
  const data = await pedidosService.crearDesdeCarrito(req.user.id_usuario, req.body ?? {});
  ok(res, data, { status: 201, message: 'Pedido creado. Continúa con el pago' });
}

async function listarMios(req, res) {
  ok(res, await pedidosService.listarMios(req.user.id_usuario));
}

async function obtener(req, res) {
  ok(res, await pedidosService.obtenerPorNumero(req.user, req.params.numero));
}

// Pago aprobado -> 201. Pago rechazado -> 402 con { ok:false, code:'PAGO_RECHAZADO' } (el pedido queda 'fallido').
async function pagar(req, res) {
  const resultado = await pedidosService.pagar(req.user.id_usuario, req.params.id, req.body ?? {});
  const { aprobado, ...data } = resultado;
  if (!aprobado) {
    return res.status(402).json({
      ok: false,
      code: 'PAGO_RECHAZADO',
      message: 'El pago fue rechazado. Puedes intentarlo de nuevo con otro medio de pago',
      data
    });
  }
  ok(res, data, { status: 201, message: 'Pago aprobado' });
}

module.exports = { crear, listarMios, obtener, pagar };

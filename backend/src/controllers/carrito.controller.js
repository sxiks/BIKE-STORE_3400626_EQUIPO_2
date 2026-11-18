const carritoService = require('../services/carrito.services');
const { ok } = require('../utils/respuesta');

async function obtener(req, res) {
  ok(res, await carritoService.obtener(req.user.id_usuario));
}

async function agregar(req, res) {
  ok(res, await carritoService.agregar(req.user.id_usuario, req.body ?? {}), { message: 'Producto agregado' });
}

async function actualizarCantidad(req, res) {
  ok(res, await carritoService.actualizarCantidad(req.user.id_usuario, req.params.idProducto, req.body ?? {}));
}

async function eliminar(req, res) {
  ok(res, await carritoService.eliminar(req.user.id_usuario, req.params.idProducto), { message: 'Producto eliminado del carrito' });
}

module.exports = { obtener, agregar, actualizarCantidad, eliminar };

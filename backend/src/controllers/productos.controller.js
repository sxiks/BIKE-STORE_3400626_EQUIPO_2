const productosService = require('../services/productos.services');
const { ok } = require('../utils/respuesta');

async function listarCategorias(req, res) {
  ok(res, await productosService.listarCategorias());
}

async function listarCatalogo(req, res) {
  ok(res, await productosService.listarCatalogo(req.query));
}

async function obtenerPublico(req, res) {
  ok(res, await productosService.obtenerPublico(req.params.id));
}

async function listarAdmin(req, res) {
  ok(res, await productosService.listarAdmin(req.query));
}

async function obtenerAdmin(req, res) {
  ok(res, await productosService.obtenerAdmin(req.params.id));
}

async function crear(req, res) {
  const data = await productosService.crear(req.body ?? {}, req.file?.filename);
  ok(res, data, { status: 201, message: 'Producto creado' });
}

async function actualizar(req, res) {
  const data = await productosService.actualizar(req.params.id, req.body ?? {}, req.file?.filename);
  ok(res, data, { message: 'Producto actualizado' });
}

async function cambiarEstado(req, res) {
  ok(res, await productosService.cambiarEstado(req.params.id, req.body ?? {}), { message: 'Estado actualizado' });
}

module.exports = { listarCategorias, listarCatalogo, obtenerPublico, listarAdmin, obtenerAdmin, crear, actualizar, cambiarEstado };

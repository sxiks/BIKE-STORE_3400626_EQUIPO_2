// Gestión de categorías del administrador (B2.2). La lista pública sigue en productos.controller.
const categoriasService = require('../services/categorias.services');
const { ok } = require('../utils/respuesta');

async function listarAdmin(req, res) {
  ok(res, await categoriasService.listarAdmin());
}

async function crear(req, res) {
  ok(res, await categoriasService.crear(req.body ?? {}), { status: 201, message: 'Categoría creada' });
}

async function renombrar(req, res) {
  ok(res, await categoriasService.renombrar(req.params.id, req.body ?? {}), { message: 'Categoría actualizada' });
}

async function eliminar(req, res) {
  ok(res, await categoriasService.eliminar(req.params.id), { message: 'Categoría eliminada' });
}

module.exports = { listarAdmin, crear, renombrar, eliminar };

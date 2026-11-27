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

// ---------- B2.2: eliminar y galería ----------

async function eliminar(req, res) {
  ok(res, await productosService.eliminar(req.params.id), { message: 'Producto eliminado' });
}

async function agregarImagen(req, res) {
  const data = await productosService.agregarImagen(req.params.id, req.file?.filename);
  ok(res, data, { status: 201, message: 'Imagen agregada' });
}

async function quitarImagen(req, res) {
  ok(res, await productosService.quitarImagen(req.params.id, req.params.idImagen), { message: 'Imagen eliminada' });
}

async function elegirPortada(req, res) {
  ok(res, await productosService.elegirPortada(req.params.id, req.params.idImagen), { message: 'Portada actualizada' });
}

async function reordenarImagenes(req, res) {
  ok(res, await productosService.reordenarImagenes(req.params.id, req.body ?? {}), { message: 'Orden actualizado' });
}

module.exports = {
  listarCategorias,
  listarCatalogo,
  obtenerPublico,
  listarAdmin,
  obtenerAdmin,
  crear,
  actualizar,
  cambiarEstado,
  eliminar,
  agregarImagen,
  quitarImagen,
  elegirPortada,
  reordenarImagenes
};

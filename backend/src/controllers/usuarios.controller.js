const usuariosService = require('../services/usuarios.services');
const { ok } = require('../utils/respuesta');

async function listar(req, res) {
  ok(res, await usuariosService.listar(req.query));
}

async function cambiarRol(req, res) {
  ok(res, await usuariosService.cambiarRol(req.user.id_usuario, req.params.id, req.body ?? {}), { message: 'Rol actualizado' });
}

async function cambiarEstado(req, res) {
  ok(res, await usuariosService.cambiarEstado(req.user.id_usuario, req.params.id, req.body ?? {}), { message: 'Estado actualizado' });
}

module.exports = { listar, cambiarRol, cambiarEstado };

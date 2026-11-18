// Capa de Negocio: administración de usuarios y sesión (CU-19 a CU-22).
const usuariosRepository = require('../repositories/usuarios.repository');
const AppError = require('../utils/AppError');
const v = require('../utils/validators');

const ROLES = ['admin', 'cliente'];
const ESTADOS = ['activo', 'inactivo'];

// Usado por el middleware authenticate en CADA solicitud (decisión G):
// un usuario desactivado o con rol cambiado pierde el acceso de inmediato.
async function obtenerSesionActiva(idUsuario) {
  const usuario = await usuariosRepository.findById(idUsuario);
  if (!usuario) throw new AppError('Sesión inválida', 401);
  if (usuario.estado !== 'activo') {
    throw new AppError('Tu cuenta está desactivada. Contacta al administrador', 403, 'CUENTA_DESACTIVADA');
  }
  return usuario;
}

async function listar({ q, rol, estado } = {}) {
  return usuariosRepository.buscar({
    q: v.textoOpcional(q, 'q', 150),
    rol: rol ? v.enLista(rol, ROLES, 'rol') : null,
    estado: estado ? v.enLista(estado, ESTADOS, 'estado') : null
  });
}

// D5: un administrador no puede quitarse su propio rol.
async function cambiarRol(idSolicitante, idObjetivo, { rol } = {}) {
  const id = v.id(idObjetivo);
  v.enLista(rol, ROLES, 'rol');
  if (id === idSolicitante) {
    throw new AppError('No puedes cambiar tu propio rol', 400, 'ACCION_SOBRE_SI_MISMO');
  }
  const usuario = await usuariosRepository.updateRol(id, rol);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  return usuario;
}

// D6: un administrador no puede desactivar su propia cuenta.
async function cambiarEstado(idSolicitante, idObjetivo, { estado } = {}) {
  const id = v.id(idObjetivo);
  v.enLista(estado, ESTADOS, 'estado');
  if (id === idSolicitante) {
    throw new AppError('No puedes cambiar el estado de tu propia cuenta', 400, 'ACCION_SOBRE_SI_MISMO');
  }
  const usuario = await usuariosRepository.updateEstado(id, estado);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  return usuario;
}

module.exports = { obtenerSesionActiva, listar, cambiarRol, cambiarEstado };

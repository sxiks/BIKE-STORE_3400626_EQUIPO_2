// Capa de Negocio: administración de usuarios y sesión (CU-19 a CU-22).
const usuariosRepository = require('../repositories/usuarios.repository');
const AppError = require('../utils/AppError');
const v = require('../utils/validators');

const ROLES = ['admin', 'cliente'];
const ESTADOS = ['activo', 'inactivo'];
const TEXTO_ESTADO = { activo: 'activa', inactivo: 'desactivada' };

// CU-20 4.2 y CU-21 2.1: pedir el valor que ya tiene se informa, no se "actualiza" en silencio.
const sinCambios = (mensaje) => new AppError(mensaje, 409, 'SIN_CAMBIOS');

async function buscarObjetivo(id) {
  const usuario = await usuariosRepository.findById(id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  return usuario;
}

// Usado por el middleware authenticate en CADA solicitud (decisión G):
// un usuario desactivado o con rol cambiado pierde el acceso de inmediato.
// emitidoMs: cuándo se firmó el token, en milisegundos. Un token anterior al último
// restablecimiento de contraseña ya no sirve, aunque no haya vencido (H-04).
async function obtenerSesionActiva(idUsuario, emitidoMs) {
  const usuario = await usuariosRepository.findSesion(idUsuario);
  if (!usuario) throw new AppError('Sesión inválida', 401);
  if (usuario.estado !== 'activo') {
    throw new AppError('Tu cuenta está desactivada. Contacta al administrador', 403, 'CUENTA_DESACTIVADA');
  }
  const { password_cambiada_en: cambiadaEn, ...sesion } = usuario;
  if (cambiadaEn && !(emitidoMs >= cambiadaEn.getTime())) {
    throw new AppError('Tu contraseña cambió. Inicia sesión de nuevo', 401, 'SESION_REVOCADA');
  }
  return sesion;
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
  if ((await buscarObjetivo(id)).rol === rol) throw sinCambios(`El usuario ya tiene el rol ${rol}`);
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
  if ((await buscarObjetivo(id)).estado === estado) {
    throw sinCambios(`La cuenta ya se encuentra ${TEXTO_ESTADO[estado]}`);
  }
  const usuario = await usuariosRepository.updateEstado(id, estado);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  return usuario;
}

module.exports = { obtenerSesionActiva, listar, cambiarRol, cambiarEstado };

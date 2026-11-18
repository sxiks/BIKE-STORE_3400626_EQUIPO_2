// Capa API: HTTP <-> servicios. Express 5 envía al errorHandler los errores de funciones async.
const authService = require('../services/auth.services');
const { ok } = require('../utils/respuesta');

async function register(req, res) {
  const data = await authService.registerUser(req.body ?? {});
  ok(res, data, { status: 201, message: 'Usuario registrado' });
}

async function login(req, res) {
  ok(res, await authService.loginUser(req.body ?? {}));
}

async function me(req, res) {
  ok(res, req.user);
}

async function recuperar(req, res) {
  const { tokenDesarrollo } = await authService.solicitarRecuperacion(req.body ?? {});
  const message = 'Si el correo está registrado, se generó un enlace de recuperación';
  ok(res, tokenDesarrollo ? { token_desarrollo: tokenDesarrollo } : undefined, { message });
}

async function restablecer(req, res) {
  await authService.restablecerPassword(req.body ?? {});
  ok(res, undefined, { message: 'Contraseña actualizada. Ya puedes iniciar sesión' });
}

module.exports = { register, login, me, recuperar, restablecer };

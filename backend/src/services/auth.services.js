// Capa de Negocio: registro, login y recuperación de contraseña (CU-09, CU-10, CU-11).
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const env = require('../config/env');
const usuariosRepository = require('../repositories/usuarios.repository');
const tokensRepository = require('../repositories/tokensRecuperacion.repository');
const { withTransaction } = require('../repositories/transaction');
const { createToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const v = require('../utils/validators');

const BCRYPT_ROUNDS = 10;
const UNIQUE_VIOLATION = '23505';

// Hash bcrypt de una clave que nadie usa. Si el correo no existe, el login compara contra este hash:
// así tarda lo mismo que con un correo registrado y el tiempo de respuesta no revela qué cuentas existen (H-12).
const HASH_FICTICIO = '$2b$10$3njVpK.ITyq.6lop/2AQ3.z5JmtZEluk6R.thbOMxmVT8VoUUq6my';

const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

function sinPassword(usuario) {
  const { password, ...resto } = usuario;
  return resto;
}

async function registerUser({ nombre, email, password } = {}) {
  const nombreLimpio = v.textoObligatorio(nombre, 'nombre', 100);
  const emailLimpio = v.normalizarEmail(email);
  v.validarEmail(emailLimpio);
  v.validarPassword(password);

  if (await usuariosRepository.existsByEmail(emailLimpio)) {
    throw new AppError('El correo ya está registrado', 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const id_usuario = await usuariosRepository.create({
      nombre: nombreLimpio,
      email: emailLimpio,
      passwordHash,
      rol: 'cliente'
    });
    return { id_usuario };
  } catch (error) {
    // Dos registros simultáneos con el mismo correo: lo detiene el índice único.
    if (error.code === UNIQUE_VIOLATION) throw new AppError('El correo ya está registrado', 409);
    throw error;
  }
}

async function loginUser({ email, password } = {}) {
  const emailLimpio = v.normalizarEmail(email);
  // typeof: un password que no es texto (un objeto, un número) es un dato inválido, no un error interno (H-05).
  if (!emailLimpio || typeof password !== 'string' || !password) {
    throw new AppError('Email y password son obligatorios', 400);
  }

  const usuario = await usuariosRepository.findByEmail(emailLimpio);
  const coincide = await bcrypt.compare(password, usuario ? usuario.password : HASH_FICTICIO);
  if (!usuario || !coincide) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  // RF-29: una cuenta desactivada no puede iniciar sesión.
  if (usuario.estado !== 'activo') {
    throw new AppError('Tu cuenta está desactivada. Contacta al administrador', 403, 'CUENTA_DESACTIVADA');
  }

  const user = sinPassword(usuario);
  return { user, token: createToken(user) };
}

// CU-11 · D8. La respuesta es la misma exista o no el correo (no revela qué cuentas existen).
async function solicitarRecuperacion({ email } = {}) {
  const emailLimpio = v.normalizarEmail(email);
  v.validarEmail(emailLimpio);

  const usuario = await usuariosRepository.findByEmail(emailLimpio);
  if (!usuario || usuario.estado !== 'activo') {
    return { tokenDesarrollo: null };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const { expira_en } = await withTransaction(async (tx) => {
    await tokensRepository.invalidarActivos(usuario.id_usuario, tx);
    return tokensRepository.crear(
      { idUsuario: usuario.id_usuario, tokenHash: sha256(token), minutos: env.resetToken.minutos },
      tx
    );
  });

  // Entrega en local (sin SMTP): siempre por consola del backend.
  console.log(
    `[recuperación] Token para ${emailLimpio} (vence ${expira_en.toISOString()}): ${token}`
  );

  // Opción de desarrollo: también en la respuesta, para que el frontend pruebe el flujo.
  // env.resetToken.enRespuesta ya exige NODE_ENV=development escrito (config/env.js).
  return { tokenDesarrollo: env.resetToken.enRespuesta ? token : null };
}

async function restablecerPassword({ token, password } = {}) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    throw new AppError('El enlace de recuperación no es válido o ya venció', 400, 'TOKEN_INVALIDO');
  }
  v.validarPassword(password);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await withTransaction(async (tx) => {
    const registro = await tokensRepository.buscarVigentePorHash(sha256(token), tx);
    if (!registro) {
      throw new AppError('El enlace de recuperación no es válido o ya venció', 400, 'TOKEN_INVALIDO');
    }
    await usuariosRepository.updatePassword(registro.id_usuario, passwordHash, tx);
    await tokensRepository.marcarUsado(registro.id_token, tx);
  });
}

module.exports = { registerUser, loginUser, solicitarRecuperacion, restablecerPassword, BCRYPT_ROUNDS };

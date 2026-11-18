// Crea el administrador inicial desde el .env (solo si no existe un usuario con ese correo).
const bcrypt = require('bcrypt');
const env = require('../config/env');
const usuariosRepository = require('../repositories/usuarios.repository');
const v = require('../utils/validators');
const { BCRYPT_ROUNDS } = require('../services/auth.services');

async function seedAdmin() {
  const { name, email, password } = env.admin;

  if (!name || !email || !password) {
    console.log('Seed de admin omitido: ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD no configurados');
    return;
  }

  const emailLimpio = v.normalizarEmail(email);
  v.validarEmail(emailLimpio);
  v.validarPassword(password); // D7 también para el admin inicial

  if (await usuariosRepository.existsByEmail(emailLimpio)) {
    console.log('Seed de admin omitido: ya existe un usuario con ese email');
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await usuariosRepository.create({ nombre: name, email: emailLimpio, passwordHash, rol: 'admin' });
  console.log(`Usuario admin creado: ${emailLimpio}`);
}

module.exports = seedAdmin;

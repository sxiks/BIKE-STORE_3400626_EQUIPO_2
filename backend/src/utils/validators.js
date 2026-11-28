// Validaciones reutilizables de la capa de negocio. Lanzan AppError 400.
const AppError = require('./AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizarEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validarEmail(email) {
  if (!EMAIL_RE.test(email) || email.length > 150) {
    throw new AppError('El correo no tiene un formato válido', 400);
  }
}

// D7: mínimo 8 caracteres, con mayúscula, minúscula y número.
function validarPassword(password) {
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new AppError(
      'La contraseña debe tener mínimo 8 caracteres, con mayúscula, minúscula y número',
      400
    );
  }
}

function textoObligatorio(valor, campo, max = 255) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) throw new AppError(`El campo ${campo} es obligatorio`, 400);
  if (texto.length > max) throw new AppError(`El campo ${campo} admite máximo ${max} caracteres`, 400);
  return texto;
}

function textoOpcional(valor, campo, max = 255) {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  if (texto.length > max) throw new AppError(`El campo ${campo} admite máximo ${max} caracteres`, 400);
  return texto;
}

// Mayor valor de una columna INT de PostgreSQL: ids, cantidades y existencias no pueden pasarlo (H-05).
const ENTERO_MAXIMO = 2147483647;

// Acepta números o texto numérico ("12"). Rechaza decimales, valores fuera de rango y basura.
function entero(valor, campo, minimo = 0) {
  const n = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
  if (!Number.isInteger(n) || n < minimo) {
    throw new AppError(`El campo ${campo} debe ser un número entero mayor o igual a ${minimo}`, 400);
  }
  if (n > ENTERO_MAXIMO) {
    throw new AppError(`El campo ${campo} admite como máximo ${ENTERO_MAXIMO}`, 400);
  }
  return n;
}

function id(valor, campo = 'id') {
  return entero(valor, campo, 1);
}

function precio(valor, campo = 'precio') {
  const n = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0 || Math.abs(Math.round(n * 100) - n * 100) > 1e-6 || n >= 1e8) {
    throw new AppError(`El campo ${campo} debe ser un valor mayor que 0 (máximo 2 decimales)`, 400);
  }
  return n;
}

function enLista(valor, lista, campo) {
  if (!lista.includes(valor)) {
    throw new AppError(`El campo ${campo} debe ser uno de: ${lista.join(', ')}`, 400);
  }
  return valor;
}

// Fecha 'YYYY-MM-DD' válida (opcional).
function fechaOpcional(valor, campo) {
  if (valor === undefined || valor === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(`${valor}T00:00:00Z`))) {
    throw new AppError(`El campo ${campo} debe tener formato AAAA-MM-DD`, 400);
  }
  return valor;
}

module.exports = {
  normalizarEmail,
  validarEmail,
  validarPassword,
  textoObligatorio,
  textoOpcional,
  entero,
  id,
  precio,
  enLista,
  fechaOpcional
};

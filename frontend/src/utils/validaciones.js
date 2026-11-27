// Validaciones de formularios (F1.3). Son las mismas reglas del backend
// (backend/src/utils/validators.js): el formulario avisa antes de enviar,
// pero la decisión final la sigue tomando la API.

// Igual que EMAIL_RE del backend.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_MAX = 150;
const NOMBRE_MAX = 100;

export const MSG_PASSWORD_D7 = 'La contraseña debe tener mínimo 8 caracteres, con mayúscula, minúscula y número';

// D7, regla por regla, para mostrar en el formulario cuáles ya se cumplen.
export function reglasPassword(password = '') {
  return [
    { id: 'longitud', texto: 'Mínimo 8 caracteres', cumple: password.length >= 8 },
    { id: 'mayuscula', texto: 'Una letra mayúscula', cumple: /[A-Z]/.test(password) },
    { id: 'minuscula', texto: 'Una letra minúscula', cumple: /[a-z]/.test(password) },
    { id: 'numero', texto: 'Un número', cumple: /\d/.test(password) }
  ];
}

export function passwordValida(password) {
  return reglasPassword(password).every((regla) => regla.cumple);
}

// Devuelve el mensaje de error del correo, o null si es válido.
export function errorEmail(email = '') {
  const limpio = email.trim();
  if (!limpio) return 'Escribe tu correo';
  if (!EMAIL_RE.test(limpio) || limpio.length > EMAIL_MAX) return 'El correo no tiene un formato válido';
  return null;
}

function errorPassword(password = '') {
  if (!password) return 'Escribe una contraseña';
  return passwordValida(password) ? null : MSG_PASSWORD_D7;
}

// Quita las claves sin error: { email: null, nombre: 'x' } -> { nombre: 'x' }.
function soloErrores(errores) {
  return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));
}

// Registro (CU-09): { campo: mensaje } solo con los campos que fallan.
export function validarRegistro({ nombre = '', email = '', password = '' } = {}) {
  const nombreLimpio = nombre.trim();
  return soloErrores({
    nombre: !nombreLimpio
      ? 'Escribe tu nombre'
      : nombreLimpio.length > NOMBRE_MAX
        ? `El nombre admite máximo ${NOMBRE_MAX} caracteres`
        : null,
    email: errorEmail(email),
    password: errorPassword(password)
  });
}

// Restablecer (CU-11): la nueva contraseña cumple D7 y la confirmación coincide.
export function validarRestablecer({ password = '', confirmacion = '' } = {}) {
  return soloErrores({
    password: errorPassword(password),
    confirmacion: !confirmacion
      ? 'Repite la contraseña'
      : confirmacion !== password
        ? 'Las contraseñas no coinciden'
        : null
  });
}

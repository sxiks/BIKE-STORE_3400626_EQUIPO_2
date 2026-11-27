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

// ---------- Productos (F2.3 · CU-12, CU-13) ----------
// Mismas reglas que productos.services.js y upload.middleware.js del backend.
export const PRODUCTO_NOMBRE_MAX = 150;
export const PRODUCTO_DESCRIPCION_MAX = 5000;
export const PRECIO_MAX = 100000000; // NUMERIC(10,2): el precio debe ser menor que esto
export const IMAGEN_TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGEN_MAX_BYTES = 2 * 1024 * 1024;

// Devuelve el mensaje de error del archivo de imagen, o null si es válido (o si no hay archivo).
// El backend además revisa el contenido del archivo; aquí solo se mira el tipo y el tamaño.
export function errorImagen(archivo) {
  if (!archivo) return null;
  if (!IMAGEN_TIPOS.includes(archivo.type)) return 'Formato de imagen no permitido. Usa JPG, PNG o WEBP';
  if (archivo.size > IMAGEN_MAX_BYTES) return 'La imagen supera el máximo de 2 MB';
  return null;
}

function errorPrecio(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'Escribe el precio';
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return 'El precio debe ser un número con máximo 2 decimales';
  const n = Number(texto);
  if (n <= 0) return 'El precio debe ser mayor que 0';
  if (n >= PRECIO_MAX) return 'El precio es demasiado alto';
  return null;
}

function errorExistencias(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'Escribe las existencias';
  return /^\d+$/.test(texto) ? null : 'Las existencias deben ser un número entero mayor o igual a 0';
}

// Crear o editar un producto: { campo: mensaje } solo con los campos que fallan.
// imagenObligatoria: true al crear (CU-12); al editar, la imagen actual se conserva si no se elige otra.
export function validarProducto(
  { nombre = '', descripcion = '', precio = '', existencias = '', id_categoria = '', imagen = null } = {},
  { imagenObligatoria = true } = {}
) {
  const nombreLimpio = nombre.trim();
  return soloErrores({
    nombre: !nombreLimpio
      ? 'Escribe el nombre del producto'
      : nombreLimpio.length > PRODUCTO_NOMBRE_MAX
        ? `El nombre admite máximo ${PRODUCTO_NOMBRE_MAX} caracteres`
        : null,
    id_categoria: id_categoria ? null : 'Elige una categoría',
    precio: errorPrecio(precio),
    existencias: errorExistencias(existencias),
    descripcion:
      descripcion.trim().length > PRODUCTO_DESCRIPCION_MAX
        ? `La descripción admite máximo ${PRODUCTO_DESCRIPCION_MAX} caracteres`
        : null,
    imagen: !imagen && imagenObligatoria ? 'Elige una imagen del producto' : errorImagen(imagen)
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

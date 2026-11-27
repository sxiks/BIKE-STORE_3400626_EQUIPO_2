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

// ---------- Checkout (F3.3 · CU-07, CU-08) ----------
// Mismas longitudes que pedidos.services.js del backend (validarEnvio y validarPago).

const ENVIO_MAX = { envio_nombre: 100, envio_telefono: 20, envio_departamento: 100, envio_ciudad: 100, envio_direccion: 255 };
const ENVIO_VACIO = {
  envio_nombre: 'Escribe el nombre de quien recibe',
  envio_telefono: 'Escribe un teléfono de contacto',
  envio_departamento: 'Elige el departamento',
  envio_ciudad: 'Escribe la ciudad o el municipio',
  envio_direccion: 'Escribe la dirección de entrega'
};

// Datos de envío: { campo: mensaje } solo con los que fallan. El teléfono admite dígitos, espacios, + y -,
// con al menos 7 dígitos (el backend solo exige texto de hasta 20 caracteres: aquí se ayuda a escribirlo bien).
export function validarEnvio(envio = {}) {
  return soloErrores(
    Object.fromEntries(
      Object.keys(ENVIO_MAX).map((campo) => {
        const valor = String(envio[campo] ?? '').trim();
        if (!valor) return [campo, ENVIO_VACIO[campo]];
        if (valor.length > ENVIO_MAX[campo]) return [campo, `Admite máximo ${ENVIO_MAX[campo]} caracteres`];
        if (campo === 'envio_telefono' && (!/^[\d\s+-]+$/.test(valor) || valor.replace(/\D/g, '').length < 7)) {
          return [campo, 'El teléfono debe tener al menos 7 dígitos (puede llevar espacios, + o -)'];
        }
        return [campo, null];
      })
    )
  );
}

export const MEDIOS_PAGO = [
  { valor: 'tarjeta_credito', texto: 'Tarjeta de crédito' },
  { valor: 'tarjeta_debito', texto: 'Tarjeta de débito' },
  { valor: 'cuenta_bancaria', texto: 'Cuenta bancaria' }
];

// Solo los dígitos del número (se ignoran espacios y guiones, como en el backend).
export const digitosPago = (numero = '') => String(numero).replace(/[\s-]/g, '');
// "•••• 1111": lo único que se muestra del número.
export const enmascararNumero = (numero = '') => `•••• ${digitosPago(numero).slice(-4)}`;

// Pago: { campo: mensaje }. Tarjetas de 13 a 19 dígitos; cuenta bancaria de 6 a 20.
export function validarPago({ medio_pago = '', numero = '' } = {}) {
  const digitos = digitosPago(numero);
  const [min, max] = medio_pago === 'cuenta_bancaria' ? [6, 20] : [13, 19];
  return soloErrores({
    medio_pago: MEDIOS_PAGO.some((m) => m.valor === medio_pago) ? null : 'Elige el medio de pago',
    numero: !digitos
      ? 'Escribe el número'
      : !/^\d+$/.test(digitos)
        ? 'El número solo puede tener dígitos'
        : digitos.length < min || digitos.length > max
          ? `El número debe tener entre ${min} y ${max} dígitos`
          : null
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

import { API_URL } from '../config/env';
import { getToken } from '../utils/storage';

// Error de la API con los datos del contrato: { ok: false, message, code?, data? } + status HTTP.
// Las pantallas reaccionan por `code` (tabla de códigos en API_CONTRATOS.md), nunca por el texto.
export class ApiError extends Error {
  constructor(message, { status = 0, code = null, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// api.js no es un componente de React y no puede usar el AuthContext.
// El AuthProvider registra aquí su función para cerrar la sesión cuando la API la rechace.
let manejadorSesionInvalida = null;

export function registrarManejadorSesionInvalida(fn) {
  manejadorSesionInvalida = fn;
  return () => {
    if (manejadorSesionInvalida === fn) manejadorSesionInvalida = null;
  };
}

// Sesión rechazada: token inválido o vencido (401) o cuenta desactivada (403 CUENTA_DESACTIVADA).
// Solo cuenta si la petición llevaba token: un login con la contraseña mal escrita no cierra nada.
function esSesionInvalida(error) {
  return error.status === 401 || (error.status === 403 && error.code === 'CUENTA_DESACTIVADA');
}

/**
 * Llama a la API y devuelve el cuerpo { ok: true, data, message? }.
 * Opciones extra: manejarSesion (default true) desactiva el manejo global de sesión inválida.
 */
export async function api(endpoint, { manejarSesion = true, ...options } = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifica que la API esté encendida.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new ApiError(data.message || 'Error en la solicitud', {
      status: response.status,
      code: data.code ?? null,
      data: data.data ?? null
    });

    if (token && manejarSesion && esSesionInvalida(error) && manejadorSesionInvalida) {
      manejadorSesionInvalida(error);
    }
    throw error;
  }

  return data;
}

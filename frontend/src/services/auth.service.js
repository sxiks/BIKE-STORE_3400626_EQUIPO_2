import { api } from './api';

export function register(data) {
  return api('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function login(data) {
  return api('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// Valida el token guardado y trae el usuario con su rol y estado actuales (CU-22).
// Sin manejo global: si falla al abrir la app, AuthContext decide qué hacer.
export function me() {
  return api('/auth/me', { manejarSesion: false });
}

// CU-11 · D8. Rutas públicas: sin manejo global de sesión. Devuelven el cuerpo completo
// porque las páginas muestran el message del backend.
export function recuperar(email) {
  return api('/auth/recuperar', {
    method: 'POST',
    body: JSON.stringify({ email }),
    manejarSesion: false
  });
}

export function restablecer(token, password) {
  return api('/auth/restablecer', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
    manejarSesion: false
  });
}

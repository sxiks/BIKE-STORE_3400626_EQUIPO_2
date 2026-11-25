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

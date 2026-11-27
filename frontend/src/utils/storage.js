// Persistencia de la sesión en localStorage. Solo la usan AuthContext y services/api.js.
const TOKEN_KEY = 'bikestore_token';
const USER_KEY = 'bikestore_user';

// Claves heredadas del Laboratorio (antes de F1.1). Se borran al iniciar la app.
const CLAVES_ANTIGUAS = ['labcrud_token', 'labcrud_user'];

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const value = localStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null; // dato corrupto: se trata como sin sesión
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function limpiarClavesAntiguas() {
  CLAVES_ANTIGUAS.forEach((clave) => localStorage.removeItem(clave));
}

// Tema de la interfaz (rediseño): 'oscuro' o 'claro'. Es una preferencia del navegador, no de la cuenta.
// Con try/catch: en algunos navegadores (modo privado, bloqueo de almacenamiento) localStorage falla.
const TEMA_KEY = 'bikestore_tema';
export const TEMAS = ['oscuro', 'claro'];

export function getTema() {
  try {
    const tema = localStorage.getItem(TEMA_KEY);
    return TEMAS.includes(tema) ? tema : 'oscuro';
  } catch {
    return 'oscuro';
  }
}

export function setTema(tema) {
  try {
    localStorage.setItem(TEMA_KEY, tema);
  } catch {
    // sin almacenamiento: el tema dura mientras la pestaña esté abierta
  }
}

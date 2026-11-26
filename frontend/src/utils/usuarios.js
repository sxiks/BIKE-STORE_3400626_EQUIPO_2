// Textos de los valores que usa la API para usuarios (funciones puras).
const ROLES = { admin: 'Administrador', cliente: 'Cliente' };
const ESTADOS = { activo: 'Activo', inactivo: 'Inactivo' };

export const nombreRol = (rol) => ROLES[rol] ?? rol;
export const nombreEstado = (estado) => ESTADOS[estado] ?? estado;

import { api } from './api';

// Administración de usuarios (CU-19, CU-20, CU-21). Solo el rol admin; el backend lo vuelve a validar.
// Contrato: sección "Usuarios · admin" de docs/diseno-tecnico/API_CONTRATOS.md.

// GET /usuarios?q=&rol=&estado= → { ok: true, data: [Usuario] }
// Los filtros vacíos no se envían: el backend los trata como "sin filtro".
export function listarUsuarios({ q = '', rol = '', estado = '' } = {}) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (rol) params.set('rol', rol);
  if (estado) params.set('estado', estado);

  const consulta = params.toString();
  return api(`/usuarios${consulta ? `?${consulta}` : ''}`);
}

// PATCH /usuarios/:id/rol → { ok: true, data: Usuario }. rol: 'admin' | 'cliente'.
export function cambiarRol(id, rol) {
  return api(`/usuarios/${id}/rol`, {
    method: 'PATCH',
    body: JSON.stringify({ rol })
  });
}

// PATCH /usuarios/:id/estado → { ok: true, data: Usuario }. estado: 'activo' | 'inactivo'.
export function cambiarEstado(id, estado) {
  return api(`/usuarios/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado })
  });
}

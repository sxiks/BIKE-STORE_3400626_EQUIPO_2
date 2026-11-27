import { api } from './api';

// Catálogo público (CU-01, CU-02). No requiere sesión.
// Contrato: sección "Catálogo y productos" de docs/diseno-tecnico/API_CONTRATOS.md.

export const ORDENES = ['precio_asc', 'precio_desc'];

// GET /categorias → { ok: true, data: [Categoria] }
export function listarCategorias() {
  return api('/categorias', { manejarSesion: false });
}

// GET /productos?categoria=&orden= → { ok: true, data: [Producto] } (solo activos)
// Los filtros vacíos no se envían. orden: 'precio_asc' | 'precio_desc'.
export function listarProductos({ categoria = '', orden = '' } = {}) {
  const params = new URLSearchParams();
  if (categoria) params.set('categoria', categoria);
  if (orden) params.set('orden', orden);

  const consulta = params.toString();
  return api(`/productos${consulta ? `?${consulta}` : ''}`, { manejarSesion: false });
}

import { api } from './api';

// Gestión de categorías del administrador (F2.4 · decisión M). La lista pública sigue en productos.service.js.
// Contrato: sección "Catálogo y productos" de docs/diseno-tecnico/API_CONTRATOS.md.

// GET /categorias/admin → { ok: true, data: [CategoriaAdmin] } (con total_productos)
export function listarCategoriasAdmin() {
  return api('/categorias/admin');
}

// POST /categorias → { ok: true, data: CategoriaAdmin } · 409 CATEGORIA_DUPLICADA
export function crearCategoria(nombre) {
  return api('/categorias', { method: 'POST', body: JSON.stringify({ nombre }) });
}

// PUT /categorias/:id → { ok: true, data: CategoriaAdmin } · 409 CATEGORIA_DUPLICADA
export function renombrarCategoria(id, nombre) {
  return api(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify({ nombre }) });
}

// DELETE /categorias/:id → { ok: true, data: { id_categoria } } · 409 CATEGORIA_CON_PRODUCTOS
export function eliminarCategoria(id) {
  return api(`/categorias/${id}`, { method: 'DELETE' });
}

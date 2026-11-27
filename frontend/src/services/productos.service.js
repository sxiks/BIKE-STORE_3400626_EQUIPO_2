import { api } from './api';

// Catálogo público (CU-01, CU-02) y administración de productos (CU-12 a CU-15).
// Contrato: sección "Catálogo y productos" de docs/diseno-tecnico/API_CONTRATOS.md.

export const ORDENES = ['precio_asc', 'precio_desc'];

// Arma "?a=1&b=2" solo con los filtros que tienen valor: el backend trata los ausentes como "sin filtro".
function consulta(filtros) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    const texto = typeof valor === 'string' ? valor.trim() : valor;
    if (texto) params.set(clave, texto);
  });
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

// ---------- Público: no requiere sesión ----------

// GET /categorias → { ok: true, data: [Categoria] }
export function listarCategorias() {
  return api('/categorias', { manejarSesion: false });
}

// GET /productos?categoria=&orden= → { ok: true, data: [Producto] } (solo activos)
// orden: 'precio_asc' | 'precio_desc'.
export function listarProductos({ categoria = '', orden = '' } = {}) {
  return api(`/productos${consulta({ categoria, orden })}`, { manejarSesion: false });
}

// GET /productos/:id → { ok: true, data: ProductoDetalle } (con la galería). 404 si no existe o está inactivo.
export function obtenerProducto(id) {
  return api(`/productos/${id}`, { manejarSesion: false });
}

// ---------- Administración: solo el rol admin; el backend lo vuelve a validar (F2.3) ----------

// GET /productos/admin?q=&categoria=&estado= → { ok: true, data: [Producto] } (incluye inactivos)
export function listarProductosAdmin({ q = '', categoria = '', estado = '' } = {}) {
  return api(`/productos/admin${consulta({ q, categoria, estado })}`);
}

// GET /productos/admin/:id → { ok: true, data: Producto } (aunque esté inactivo)
export function obtenerProductoAdmin(id) {
  return api(`/productos/admin/${id}`);
}

// POST /productos (multipart) → { ok: true, data: Producto }.
// datos: FormData con nombre, descripcion, precio, existencias, id_categoria e imagen.
// api.js detecta el FormData y no pone Content-Type: el navegador agrega el boundary.
export function crearProducto(datos) {
  return api('/productos', { method: 'POST', body: datos });
}

// PUT /productos/:id (multipart, actualización parcial) → { ok: true, data: Producto }.
// La imagen solo va en el FormData si se eligió una nueva.
export function actualizarProducto(id, datos) {
  return api(`/productos/${id}`, { method: 'PUT', body: datos });
}

// PATCH /productos/:id/estado → { ok: true, data: Producto }. estado: 'activo' | 'inactivo' (borrado lógico, CU-14).
export function cambiarEstadoProducto(id, estado) {
  return api(`/productos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado })
  });
}

// ---------- Eliminar y galería (F2.4 · decisión M) ----------

// DELETE /productos/:id → { ok: true, data: { id_producto } } · 409 PRODUCTO_CON_PEDIDOS (inactivarlo en su lugar)
export function eliminarProducto(id) {
  return api(`/productos/${id}`, { method: 'DELETE' });
}

// Todas las acciones de la galería responden { ok: true, data: ProductoDetalle }.

// POST /productos/:id/imagenes (multipart, campo `imagen`) · 409 LIMITE_IMAGENES
export function agregarImagen(id, archivo) {
  const datos = new FormData();
  datos.append('imagen', archivo);
  return api(`/productos/${id}/imagenes`, { method: 'POST', body: datos });
}

// DELETE /productos/:id/imagenes/:idImagen
export function quitarImagen(id, idImagen) {
  return api(`/productos/${id}/imagenes/${idImagen}`, { method: 'DELETE' });
}

// PATCH /productos/:id/imagenes/:idImagen/portada (intercambia con la portada actual)
export function elegirPortada(id, idImagen) {
  return api(`/productos/${id}/imagenes/${idImagen}/portada`, { method: 'PATCH' });
}

// PATCH /productos/:id/imagenes/orden · ids: todos los id_imagen de la galería en el orden nuevo
export function reordenarImagenes(id, ids) {
  return api(`/productos/${id}/imagenes/orden`, { method: 'PATCH', body: JSON.stringify({ ids }) });
}

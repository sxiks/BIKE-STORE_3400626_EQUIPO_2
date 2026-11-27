import { api } from './api';

// Carrito del cliente en la API (F3.1 · CU-03 a CU-07). Solo el rol cliente (D1, K); el backend lo vuelve a validar.
// El carrito es el pedido del cliente en estado 'carrito' (D12). Todas las rutas responden { ok: true, data: Carrito }.
// Contrato: sección "Carrito · cliente" de docs/diseno-tecnico/API_CONTRATOS.md.

// GET /carrito → vacío con id_pedido: null si el cliente aún no tiene carrito (consultar no lo crea).
export function obtenerCarrito() {
  return api('/carrito');
}

// POST /carrito/items → si el producto ya está, se suman las cantidades (R2).
// Errores: 400 PRODUCTO_INACTIVO | SIN_STOCK | STOCK_MAXIMO (data.maximo, data.en_carrito) · 404
export function agregarAlCarrito(idProducto, cantidad = 1) {
  return api('/carrito/items', { method: 'POST', body: JSON.stringify({ id_producto: idProducto, cantidad }) });
}

// PUT /carrito/items/:id → fija la cantidad. Errores: 400 CANTIDAD_MINIMA | STOCK_MAXIMO · 404
export function cambiarCantidadCarrito(idProducto, cantidad) {
  return api(`/carrito/items/${idProducto}`, { method: 'PUT', body: JSON.stringify({ cantidad }) });
}

// DELETE /carrito/items/:id → siempre se permite, incluso si el producto está inactivo (D4). 404 si no está.
export function quitarDelCarrito(idProducto) {
  return api(`/carrito/items/${idProducto}`, { method: 'DELETE' });
}

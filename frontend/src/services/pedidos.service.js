import { api } from './api';

// Pedidos del cliente (F3.2 · CU-08). Solo el rol cliente lista los suyos; el detalle lo ve el dueño (o un admin).
// Contrato: sección "Pedidos y pago · cliente" de docs/diseno-tecnico/API_CONTRATOS.md.

// GET /pedidos → { ok: true, data: [Pedido sin items ni pagos] }, del más reciente al más antiguo. Nunca el carrito.
export function listarPedidos() {
  return api('/pedidos');
}

// GET /pedidos/:numero → { ok: true, data: Pedido } con items y pagos · 404 si no existe o no es del cliente.
export function obtenerPedido(numero) {
  return api(`/pedidos/${encodeURIComponent(numero)}`);
}

// ---------- Checkout (F3.3 · CU-07, CU-08) ----------

// POST /pedidos → confirma el carrito: pasa a 'pendiente' con su numero_pedido y el carrito queda vacío.
// envio: { envio_nombre, envio_telefono, envio_departamento, envio_ciudad, envio_direccion }
// Errores: 400 CARRITO_VACIO o datos de envío incompletos · 409 CARRITO_NO_DISPONIBLE (data.items)
export function confirmarCarrito(envio) {
  return api('/pedidos', { method: 'POST', body: JSON.stringify(envio) });
}

// POST /pedidos/:id/pagos → 201 aprobado (data: { numero_pedido, estado, valor_pagado, pago }).
// Errores: 402 PAGO_RECHAZADO (el pedido queda 'fallido' y se puede reintentar) · 409 SIN_STOCK (data.items,
// no se cobró nada) · 409 PEDIDO_YA_PAGADO · 400 datos de pago inválidos · 404
// El número completo solo viaja en esta petición: no se guarda en ningún otro lado del frontend.
export function pagarPedido(idPedido, { medio_pago, numero }) {
  return api(`/pedidos/${idPedido}/pagos`, { method: 'POST', body: JSON.stringify({ medio_pago, numero }) });
}

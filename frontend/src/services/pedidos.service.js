import { api } from './api';

// Pedidos del cliente (F3.2 · CU-08). Solo el rol cliente lista los suyos; el detalle lo ve el dueño (o un admin).
// F3.3 agrega aquí confirmar el carrito (POST /pedidos) y pagar (POST /pedidos/:id/pagos).
// Contrato: sección "Pedidos y pago · cliente" de docs/diseno-tecnico/API_CONTRATOS.md.

// GET /pedidos → { ok: true, data: [Pedido sin items ni pagos] }, del más reciente al más antiguo. Nunca el carrito.
export function listarPedidos() {
  return api('/pedidos');
}

// GET /pedidos/:numero → { ok: true, data: Pedido } con items y pagos · 404 si no existe o no es del cliente.
export function obtenerPedido(numero) {
  return api(`/pedidos/${encodeURIComponent(numero)}`);
}

// Textos de los valores que usa la API para pedidos y pagos (funciones puras, F3.2).

// Estado del pedido → texto y estilo de etiqueta (.etiqueta--exito|aviso|error de base.css).
const ESTADOS_PEDIDO = {
  pagado: { texto: 'Pagado', estilo: 'exito' },
  pendiente: { texto: 'Pendiente de pago', estilo: 'aviso' },
  fallido: { texto: 'Pago rechazado', estilo: 'error' }
};
export const estadoPedido = (estado) => ESTADOS_PEDIDO[estado] ?? { texto: estado, estilo: 'aviso' };

// Un pedido pendiente o con el pago rechazado se puede (volver a) pagar (decisión F).
export const sePuedePagar = (estado) => estado === 'pendiente' || estado === 'fallido';

const ESTADOS_PAGO = {
  aprobado: { texto: 'Aprobado', estilo: 'exito' },
  rechazado: { texto: 'Rechazado', estilo: 'error' }
};
export const estadoPago = (estado) => ESTADOS_PAGO[estado] ?? { texto: estado, estilo: 'aviso' };

const MEDIOS = {
  tarjeta_credito: 'Tarjeta de crédito',
  tarjeta_debito: 'Tarjeta de débito',
  cuenta_bancaria: 'Cuenta bancaria'
};
export const nombreMedio = (medio) => MEDIOS[medio] ?? medio;

// Fecha y hora en la zona horaria del navegador ("27 nov 2026, 2:18 p. m.").
const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
export function formatoFechaHora(valor) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : formatoFecha.format(fecha);
}

// Utilidades para preparar pedidos por la API en las pruebas del tablero, la exportación y el listado
// del admin (B4). Usan los mismos endpoints que el cliente: carrito -> confirmar -> pagar.
const { pool } = require('./db');

const ENVIO = {
  envio_nombre: 'Ana Cliente',
  envio_telefono: '3001234567',
  envio_departamento: 'Valle del Cauca',
  envio_ciudad: 'Palmira',
  envio_direccion: 'Calle 1 # 2-3'
};
const TARJETA_OK = { medio_pago: 'tarjeta_credito', numero: '4111111111111111' };
const TARJETA_RECHAZO = { medio_pago: 'tarjeta_debito', numero: '4111111111110000' }; // decisión D

// lineas: [[id_producto, cantidad], ...]. resultado: 'pagado' (por defecto), 'pendiente' o 'fallido'.
// fecha: si se indica, se fija fecha_pedido (timestamp con zona, p. ej. '2026-03-15 23:30-05').
async function comprar(api, lineas, { resultado = 'pagado', fecha } = {}) {
  for (const [id_producto, cantidad] of lineas) {
    const r = await api.post('/api/carrito/items', { id_producto, cantidad });
    if (r.status >= 300) throw new Error(`No se pudo agregar ${id_producto}: ${r.status} ${r.body.message}`);
  }
  const confirmado = await api.post('/api/pedidos', ENVIO);
  if (confirmado.status !== 201) throw new Error(`No se pudo confirmar: ${confirmado.body.message}`);
  const pedido = confirmado.body.data;
  if (resultado !== 'pendiente') {
    await api.post(`/api/pedidos/${pedido.id_pedido}/pagos`, resultado === 'pagado' ? TARJETA_OK : TARJETA_RECHAZO);
  }
  if (fecha) await pool.query('UPDATE pedidos SET fecha_pedido = $2 WHERE id_pedido = $1', [pedido.id_pedido, fecha]);
  return pedido;
}

module.exports = { ENVIO, comprar };

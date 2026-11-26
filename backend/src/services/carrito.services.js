// Capa de Negocio: carrito persistido por cliente (CU-03 a CU-07; R2; D1; D4).
// El carrito es el pedido del cliente en estado 'carrito'; sus líneas están en detalle_pedido.
const pedidosRepository = require('../repositories/pedidos.repository');
const productosRepository = require('../repositories/productos.repository');
const AppError = require('../utils/AppError');
const v = require('../utils/validators');

const MSG_MAX = 'Este es el máximo de producto disponible en stock';

// Marca cada ítem con su disponibilidad actual (CU-06) y calcula totales (CU-04).
function armarCarrito(idPedido, filas) {
  const items = filas.map((fila) => {
    let motivo = null;
    if (fila.estado !== 'activo') motivo = 'INACTIVO';
    else if (fila.existencias === 0) motivo = 'SIN_STOCK';
    else if (fila.cantidad > fila.existencias) motivo = 'SUPERA_STOCK';
    return {
      ...fila,
      subtotal: Math.round(fila.precio * fila.cantidad * 100) / 100,
      disponible: motivo === null,
      motivo
    };
  });
  const total = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
  return {
    id_pedido: idPedido,
    items,
    total_unidades: items.reduce((s, i) => s + i.cantidad, 0),
    total,
    // CU-07: la compra se bloquea si hay ítems no disponibles o el carrito está vacío.
    puede_comprar: items.length > 0 && items.every((i) => i.disponible)
  };
}

// Carrito de un pedido ya conocido; `db` permite leerlo dentro de una transacción (confirmar).
async function armarDesdePedido(idPedido, db) {
  return armarCarrito(idPedido, await pedidosRepository.listarLineasCarrito(idPedido, db));
}

async function obtener(idUsuario) {
  return armarDesdePedido(await pedidosRepository.obtenerOCrearCarrito(idUsuario));
}

async function productoComprable(idProducto) {
  const producto = await productosRepository.findById(idProducto);
  if (!producto) throw new AppError('Producto no encontrado', 404);
  if (producto.estado !== 'activo') throw new AppError('El producto no está disponible', 400, 'PRODUCTO_INACTIVO');
  if (producto.existencias === 0) throw new AppError('El producto está agotado', 400, 'SIN_STOCK');
  return producto;
}

// CU-03: agregar (si ya está, se suma — R2) sin superar las existencias (CU-05).
async function agregar(idUsuario, { id_producto, cantidad = 1 } = {}) {
  const idProducto = v.id(id_producto, 'id_producto');
  const unidades = v.entero(cantidad, 'cantidad', 1);
  const producto = await productoComprable(idProducto);
  const idPedido = await pedidosRepository.obtenerOCrearCarrito(idUsuario);
  const actual = await pedidosRepository.cantidadEnCarrito(idPedido, idProducto);

  if (actual + unidades > producto.existencias) {
    throw new AppError(MSG_MAX, 400, 'STOCK_MAXIMO', { maximo: producto.existencias, en_carrito: actual });
  }
  await pedidosRepository.sumarLineaCarrito(idPedido, idProducto, unidades, producto.precio);
  return obtener(idUsuario);
}

// CU-05: fijar cantidad. Cantidad 0 se rechaza y el frontend ofrece eliminar (antes D2).
async function actualizarCantidad(idUsuario, idProductoParam, { cantidad } = {}) {
  const idProducto = v.id(idProductoParam, 'id_producto');
  const unidades = v.entero(cantidad, 'cantidad', 0);
  if (unidades === 0) {
    throw new AppError(
      'Esta es la cantidad mínima (1). ¿Deseas eliminar el producto del carrito?',
      400,
      'CANTIDAD_MINIMA'
    );
  }
  const producto = await productoComprable(idProducto);
  if (unidades > producto.existencias) {
    throw new AppError(MSG_MAX, 400, 'STOCK_MAXIMO', { maximo: producto.existencias });
  }
  const idPedido = await pedidosRepository.obtenerOCrearCarrito(idUsuario);
  const afectados = await pedidosRepository.fijarCantidadCarrito(idPedido, idProducto, unidades);
  if (!afectados) throw new AppError('El producto no está en el carrito', 404);
  return obtener(idUsuario);
}

// Eliminar siempre se permite, incluso si el producto está inactivo (D4).
async function eliminar(idUsuario, idProductoParam) {
  const idProducto = v.id(idProductoParam, 'id_producto');
  const idPedido = await pedidosRepository.obtenerOCrearCarrito(idUsuario);
  const afectados = await pedidosRepository.eliminarLineaCarrito(idPedido, idProducto);
  if (!afectados) throw new AppError('El producto no está en el carrito', 404);
  return obtener(idUsuario);
}

module.exports = { obtener, armarDesdePedido, agregar, actualizarCantidad, eliminar, MSG_MAX };

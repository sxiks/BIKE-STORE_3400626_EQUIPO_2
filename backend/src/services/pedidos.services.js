// Capa de Negocio: pedidos y pago simulado (CU-07, CU-08; R3–R6; decisiones D, E, F).
const carritoService = require('./carrito.services');
const pedidosRepository = require('../repositories/pedidos.repository');
const pagosRepository = require('../repositories/pagos.repository');
const productosRepository = require('../repositories/productos.repository');
const carritosRepository = require('../repositories/carritos.repository');
const { withTransaction } = require('../repositories/transaction');
const AppError = require('../utils/AppError');
const v = require('../utils/validators');

const MEDIOS_PAGO = ['tarjeta_credito', 'tarjeta_debito', 'cuenta_bancaria'];
// Decisión D: un número que termine en 0000 simula un pago rechazado.
const SUFIJO_RECHAZO = '0000';

function validarEnvio(datos = {}) {
  return {
    envio_nombre: v.textoObligatorio(datos.envio_nombre, 'envio_nombre', 100),
    envio_telefono: v.textoObligatorio(datos.envio_telefono, 'envio_telefono', 20),
    envio_departamento: v.textoObligatorio(datos.envio_departamento, 'envio_departamento', 100),
    envio_ciudad: v.textoObligatorio(datos.envio_ciudad, 'envio_ciudad', 100),
    envio_direccion: v.textoObligatorio(datos.envio_direccion, 'envio_direccion', 255)
  };
}

// R5: el número completo solo se usa para validar; se guardan únicamente los últimos 4.
function validarPago({ medio_pago, numero } = {}) {
  v.enLista(medio_pago, MEDIOS_PAGO, 'medio_pago');
  const digitos = typeof numero === 'string' || typeof numero === 'number' ? String(numero).replace(/[\s-]/g, '') : '';
  const [min, max] = medio_pago === 'cuenta_bancaria' ? [6, 20] : [13, 19];
  if (!/^\d+$/.test(digitos) || digitos.length < min || digitos.length > max) {
    throw new AppError(`El número debe tener entre ${min} y ${max} dígitos`, 400);
  }
  return { medioPago: medio_pago, ultimos4: digitos.slice(-4) };
}

async function detalleCompleto(pedido) {
  const [items, pagos] = await Promise.all([
    pedidosRepository.listarDetalle(pedido.id_pedido),
    pagosRepository.listarPorPedido(pedido.id_pedido)
  ]);
  return { ...pedido, items, pagos };
}

// CU-07 + CU-08 (inicio): crea el pedido 'pendiente' desde el carrito, sin tocar el stock.
async function crearDesdeCarrito(idUsuario, datos) {
  const envio = validarEnvio(datos);
  const carrito = await carritoService.obtener(idUsuario);

  if (carrito.items.length === 0) throw new AppError('El carrito está vacío', 400, 'CARRITO_VACIO');
  if (!carrito.puede_comprar) {
    const noDisponibles = carrito.items.filter((i) => !i.disponible).map(({ id_producto, nombre, motivo }) => ({ id_producto, nombre, motivo }));
    throw new AppError('Hay productos no disponibles en el carrito', 409, 'CARRITO_NO_DISPONIBLE', { items: noDisponibles });
  }

  const pedido = await withTransaction(async (tx) => {
    const creado = await pedidosRepository.crear(idUsuario, envio, tx);
    await pedidosRepository.insertarDetalle(creado.id_pedido, carrito.items, tx); // copia del precio (R3)
    return creado;
  });

  return detalleCompleto(await pedidosRepository.findById(pedido.id_pedido));
}

async function listarMios(idUsuario) {
  return pedidosRepository.listarPorUsuario(idUsuario);
}

// El dueño ve su pedido; el admin puede ver cualquiera.
async function obtenerPorNumero(usuario, numero) {
  const pedido = await pedidosRepository.findByNumero(String(numero || ''));
  if (!pedido || (pedido.id_usuario !== usuario.id_usuario && usuario.rol !== 'admin')) {
    throw new AppError('Pedido no encontrado', 404);
  }
  return detalleCompleto(pedido);
}

// CU-08: pago simulado. Todo en UNA transacción (decisión 10 con el ajuste E):
//   1. bloquear pedido y productos (orden por id_producto, evita deadlocks)
//   2. validar estado y existencias ANTES de simular -> si falla: 409 y no se registra pago
//   3. simular el resultado (decisión D)
//   4a. aprobado: descontar stock, pago 'aprobado', pedido 'pagado', vaciar carrito
//   4b. rechazado: pago 'rechazado', pedido 'fallido' (se puede reintentar: decisión F)
async function pagar(idUsuario, idPedidoParam, datos) {
  const idPedido = v.id(idPedidoParam);
  const { medioPago, ultimos4 } = validarPago(datos);

  const resultado = await withTransaction(async (tx) => {
    const pedido = await pedidosRepository.bloquear(idPedido, tx);
    if (!pedido || pedido.id_usuario !== idUsuario) throw new AppError('Pedido no encontrado', 404);
    if (pedido.estado === 'pagado') throw new AppError('El pedido ya fue pagado', 409, 'PEDIDO_YA_PAGADO');

    const detalle = await pedidosRepository.listarDetalle(idPedido, tx);
    const productos = await productosRepository.bloquearPorIds(detalle.map((d) => d.id_producto), tx);
    const porId = new Map(productos.map((p) => [p.id_producto, p]));

    const problemas = detalle
      .map((d) => {
        const p = porId.get(d.id_producto);
        if (p.estado !== 'activo') return { id_producto: d.id_producto, nombre: p.nombre, motivo: 'INACTIVO' };
        if (p.existencias < d.cantidad) {
          return { id_producto: d.id_producto, nombre: p.nombre, motivo: 'SIN_STOCK', disponibles: p.existencias };
        }
        return null;
      })
      .filter(Boolean);
    if (problemas.length) {
      throw new AppError('No hay existencias suficientes para completar el pedido', 409, 'SIN_STOCK', { items: problemas });
    }

    const total = await pedidosRepository.calcularTotal(idPedido, tx);

    if (ultimos4 === SUFIJO_RECHAZO) {
      const pago = await pagosRepository.crear({ idPedido, medioPago, ultimos4, valor: total, estado: 'rechazado' }, tx);
      await pedidosRepository.actualizarEstado(idPedido, 'fallido', tx);
      return { aprobado: false, numero_pedido: pedido.numero_pedido, estado: 'fallido', pago };
    }

    for (const d of detalle) {
      const ok = await productosRepository.descontarExistencias(d.id_producto, d.cantidad, tx);
      if (!ok) throw new AppError('No hay existencias suficientes para completar el pedido', 409, 'SIN_STOCK');
    }
    const pago = await pagosRepository.crear({ idPedido, medioPago, ultimos4, valor: total, estado: 'aprobado' }, tx);
    await pedidosRepository.actualizarEstado(idPedido, 'pagado', tx);
    await carritosRepository.vaciarPorUsuario(idUsuario, tx);
    return { aprobado: true, numero_pedido: pedido.numero_pedido, estado: 'pagado', valor_pagado: total, pago };
  });

  return resultado;
}

module.exports = { crearDesdeCarrito, listarMios, obtenerPorNumero, pagar, MEDIOS_PAGO };

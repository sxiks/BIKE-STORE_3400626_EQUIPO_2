// Capa de Negocio: tablero de control (CU-16, CU-17). La exportación (CU-18) está decidida (D11) y se
// implementa en el Sprint 4 (tarea B4.1).
const env = require('../config/env');
const dashboardRepository = require('../repositories/dashboard.repository');
const AppError = require('../utils/AppError');
const v = require('../utils/validators');

function criterios({ desde, hasta, categoria } = {}) {
  const c = {
    desde: v.fechaOpcional(desde, 'desde'),
    hasta: v.fechaOpcional(hasta, 'hasta'),
    idCategoria: categoria ? v.id(categoria, 'categoria') : null
  };
  if (c.desde && c.hasta && c.desde > c.hasta) {
    throw new AppError('La fecha "desde" no puede ser posterior a "hasta"', 400);
  }
  return c;
}

async function metricas(query) {
  const c = criterios(query);
  const [resumen, mas_vendidos] = await Promise.all([
    dashboardRepository.resumenVentas(c),
    dashboardRepository.masVendidos(c, 5)
  ]);
  return { filtros: { desde: c.desde, hasta: c.hasta, categoria: c.idCategoria }, ...resumen, mas_vendidos };
}

async function alertas() {
  const [stock_bajo, agotados, inactivos_en_carritos, pedidos_pendientes, pedidos_fallidos] = await Promise.all([
    dashboardRepository.productosStockBajo(env.stockBajoUmbral),
    dashboardRepository.productosAgotados(),
    dashboardRepository.inactivosEnCarritos(),
    dashboardRepository.pedidosPorEstado('pendiente'),
    dashboardRepository.pedidosPorEstado('fallido')
  ]);
  return {
    umbral_stock_bajo: env.stockBajoUmbral,
    stock_bajo,
    agotados,
    inactivos_en_carritos,
    pedidos_pendientes,
    pedidos_fallidos
  };
}

module.exports = { metricas, alertas };

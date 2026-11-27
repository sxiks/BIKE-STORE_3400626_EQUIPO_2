// Capa de Negocio: tablero de control (CU-16, CU-17) y exportación del informe (CU-18, decisión D11).
const env = require('../config/env');
const dashboardRepository = require('../repositories/dashboard.repository');
const categoriasRepository = require('../repositories/categorias.repository');
const { generarXlsx } = require('../utils/informe/xlsx');
const { generarPdf } = require('../utils/informe/pdf');
const { fechaArchivo } = require('../utils/informe/formato');
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

// CU-18 (B4.1): el informe usa las MISMAS consultas que /metricas y /alertas, así sus cifras coinciden
// con el tablero para el mismo filtro. El archivo se arma en memoria y se devuelve como Buffer.
const FORMATOS = {
  xlsx: { tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', generar: generarXlsx },
  pdf: { tipo: 'application/pdf', generar: generarPdf }
};

async function exportar(query = {}) {
  const formato = FORMATOS[query.formato];
  if (!formato) throw new AppError('El campo formato debe ser uno de: xlsx, pdf', 400);

  const c = criterios(query);
  let nombreCategoria = null;
  if (c.idCategoria) {
    const categoria = await categoriasRepository.findById(c.idCategoria);
    if (!categoria) throw new AppError('La categoría no existe', 400);
    nombreCategoria = categoria.nombre;
  }

  const [m, a] = await Promise.all([metricas(query), alertas()]);
  const generado = new Date();
  const informe = {
    generado,
    filtros: { desde: c.desde, hasta: c.hasta, categoria: nombreCategoria },
    resumen: {
      ventas_totales: Number(m.ventas_totales),
      cantidad_pedidos: Number(m.cantidad_pedidos),
      unidades_vendidas: Number(m.unidades_vendidas)
    },
    mas_vendidos: m.mas_vendidos.map((p) => ({ nombre: p.nombre, unidades: Number(p.unidades), ventas: Number(p.ventas) })),
    inventario: {
      umbral: a.umbral_stock_bajo,
      stock_bajo: a.stock_bajo.map((p) => ({ nombre: p.nombre, existencias: Number(p.existencias) })),
      agotados: a.agotados.map((p) => ({ nombre: p.nombre }))
    }
  };

  return {
    contenido: await formato.generar(informe),
    tipo: formato.tipo,
    nombreArchivo: `bike-store-informe-${fechaArchivo(generado)}.${query.formato}`
  };
}

module.exports = { metricas, alertas, exportar };

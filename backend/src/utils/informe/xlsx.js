// Informe del tablero en Excel (B4.1 · CU-18 · decisión D11), generado en memoria con exceljs.
// Recibe los datos ya calculados por dashboard.services (no consulta la base) y devuelve un Buffer.
// Hojas: "Resumen" (encabezado, filtros, totales y más vendidos) e "Inventario" (stock bajo y agotados).
const ExcelJS = require('exceljs');
const { formatoFechaHora, textoPeriodo } = require('./formato');

const COP = '"$" #,##0'; // los montos quedan como números: se pueden sumar en Excel
const NEGRITA = { bold: true };
const TITULO = { bold: true, size: 16 };
const SUBTITULO = { bold: true, size: 12 };
const ENCABEZADO_TABLA = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
};

function encabezadoTabla(fila) {
  fila.eachCell((celda) => {
    celda.font = ENCABEZADO_TABLA.font;
    celda.fill = ENCABEZADO_TABLA.fill;
  });
}

async function generarXlsx(informe) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Bike Store';
  libro.created = informe.generado;

  // ---------- Hoja Resumen ----------
  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [{ width: 40 }, { width: 16 }, { width: 18 }];
  const etiqueta = (fila) => {
    fila.getCell(1).font = NEGRITA;
    fila.getCell(2).alignment = { horizontal: 'left' };
    return fila;
  };

  resumen.addRow(['Informe de ventas · Bike Store']).font = TITULO;
  resumen.addRow([`Generado el ${formatoFechaHora(informe.generado)}`]);
  resumen.addRow([]);
  resumen.addRow(['Filtros']).font = SUBTITULO;
  etiqueta(resumen.addRow(['Periodo', textoPeriodo(informe.filtros)]));
  etiqueta(resumen.addRow(['Categoría', informe.filtros.categoria ?? 'Todas']));
  resumen.addRow([]);

  resumen.addRow(['Resumen']).font = SUBTITULO;
  etiqueta(resumen.addRow(['Ventas totales', informe.resumen.ventas_totales])).getCell(2).numFmt = COP;
  etiqueta(resumen.addRow(['Pedidos pagados', informe.resumen.cantidad_pedidos]));
  etiqueta(resumen.addRow(['Unidades vendidas', informe.resumen.unidades_vendidas]));
  resumen.addRow([]);

  resumen.addRow(['Más vendidos']).font = SUBTITULO;
  // Ordenados de mayor a menor: la fila indica el puesto.
  encabezadoTabla(resumen.addRow(['Producto', 'Unidades', 'Ventas']));
  if (informe.mas_vendidos.length === 0) resumen.addRow(['Sin ventas en el periodo']);
  informe.mas_vendidos.forEach((p) => {
    resumen.addRow([p.nombre, p.unidades, p.ventas]).getCell(3).numFmt = COP;
  });

  // ---------- Hoja Inventario ----------
  const inventario = libro.addWorksheet('Inventario');
  inventario.columns = [{ width: 40 }, { width: 16 }];
  inventario.addRow(['Inventario actual (no depende de los filtros)']).font = TITULO;
  inventario.addRow([`Stock bajo: 1 a ${informe.inventario.umbral} unidades`]);
  inventario.addRow([]);

  inventario.addRow(['Stock bajo']).font = SUBTITULO;
  encabezadoTabla(inventario.addRow(['Producto', 'Existencias']));
  if (informe.inventario.stock_bajo.length === 0) inventario.addRow(['Ningún producto con stock bajo']);
  informe.inventario.stock_bajo.forEach((p) => inventario.addRow([p.nombre, p.existencias]));
  inventario.addRow([]);

  inventario.addRow(['Agotados']).font = SUBTITULO;
  encabezadoTabla(inventario.addRow(['Producto']));
  if (informe.inventario.agotados.length === 0) inventario.addRow(['Ningún producto agotado']);
  informe.inventario.agotados.forEach((p) => inventario.addRow([p.nombre]));

  return Buffer.from(await libro.xlsx.writeBuffer());
}

module.exports = { generarXlsx };

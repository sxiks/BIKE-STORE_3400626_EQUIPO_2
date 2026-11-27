// Informe del tablero en PDF (B4.1 · CU-18 · decisión D11), generado en memoria con pdfkit (tamaño carta).
// Recibe los datos ya calculados por dashboard.services (no consulta la base) y devuelve un Buffer.
// Usa la fuente Helvetica incluida en pdfkit, que cubre tildes, ñ y el símbolo $.
const PDFDocument = require('pdfkit');
const { formatoCOP, formatoFechaHora, textoPeriodo } = require('./formato');

const GRIS = '#4b5563';
const OSCURO = '#111827';
const BORDE = '#d1d5db';

// Tabla simple: columnas [{ titulo, ancho, alinear }] y filas de textos. Salta de página si no cabe.
function tabla(doc, columnas, filas, vacio) {
  const x0 = doc.page.margins.left;
  const alto = 20;
  const dibujarFila = (celdas, { encabezado = false } = {}) => {
    if (doc.y + alto > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const y = doc.y;
    if (encabezado) doc.rect(x0, y, columnas.reduce((s, c) => s + c.ancho, 0), alto).fill(OSCURO);
    let x = x0;
    celdas.forEach((texto, i) => {
      const col = columnas[i];
      doc
        .font(encabezado ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(10)
        .fillColor(encabezado ? '#ffffff' : OSCURO)
        .text(String(texto), x + 6, y + 6, { width: col.ancho - 12, align: col.alinear ?? 'left', lineBreak: false, ellipsis: true });
      x += col.ancho;
    });
    doc
      .moveTo(x0, y + alto)
      .lineTo(x, y + alto)
      .strokeColor(BORDE)
      .lineWidth(0.5)
      .stroke();
    doc.x = x0;
    doc.y = y + alto;
  };
  dibujarFila(columnas.map((c) => c.titulo), { encabezado: true });
  if (filas.length === 0) dibujarFila([vacio, ...columnas.slice(1).map(() => '')]);
  filas.forEach((f) => dibujarFila(f));
  doc.moveDown(1);
}

function subtitulo(doc, texto) {
  if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(OSCURO).text(texto, doc.page.margins.left);
  doc.moveDown(0.4);
}

function generarPdf(informe) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50, info: { Title: 'Informe de ventas · Bike Store', Author: 'Bike Store' } });
    const partes = [];
    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Encabezado y filtros
    doc.font('Helvetica-Bold').fontSize(20).fillColor(OSCURO).text('Informe de ventas · Bike Store');
    doc.font('Helvetica').fontSize(10).fillColor(GRIS).text(`Generado el ${formatoFechaHora(informe.generado)}`);
    doc.moveDown(0.8);
    doc.fontSize(11).fillColor(OSCURO);
    doc.font('Helvetica-Bold').text('Periodo: ', { continued: true }).font('Helvetica').text(textoPeriodo(informe.filtros));
    doc.font('Helvetica-Bold').text('Categoría: ', { continued: true }).font('Helvetica').text(informe.filtros.categoria ?? 'Todas');
    doc.moveDown(1);

    // Resumen: tres recuadros
    subtitulo(doc, 'Resumen');
    const datos = [
      ['Ventas totales', formatoCOP(informe.resumen.ventas_totales)],
      ['Pedidos pagados', String(informe.resumen.cantidad_pedidos)],
      ['Unidades vendidas', String(informe.resumen.unidades_vendidas)]
    ];
    const anchoCaja = (ancho - 20) / 3;
    const yCaja = doc.y;
    datos.forEach(([etiqueta, valor], i) => {
      const x = doc.page.margins.left + i * (anchoCaja + 10);
      doc.roundedRect(x, yCaja, anchoCaja, 58, 6).strokeColor(BORDE).lineWidth(1).stroke();
      doc.font('Helvetica').fontSize(9).fillColor(GRIS).text(etiqueta, x + 10, yCaja + 10, { width: anchoCaja - 20 });
      doc.font('Helvetica-Bold').fontSize(16).fillColor(OSCURO).text(valor, x + 10, yCaja + 26, { width: anchoCaja - 20 });
    });
    doc.x = doc.page.margins.left;
    doc.y = yCaja + 74;

    // Más vendidos
    subtitulo(doc, 'Más vendidos');
    tabla(
      doc,
      [
        { titulo: '#', ancho: 30 },
        { titulo: 'Producto', ancho: ancho - 30 - 90 - 120 },
        { titulo: 'Unidades', ancho: 90, alinear: 'right' },
        { titulo: 'Ventas', ancho: 120, alinear: 'right' }
      ],
      informe.mas_vendidos.map((p, i) => [i + 1, p.nombre, p.unidades, formatoCOP(p.ventas)]),
      'Sin ventas en el periodo'
    );

    // Inventario (estado actual)
    subtitulo(doc, 'Inventario actual');
    doc.font('Helvetica').fontSize(9).fillColor(GRIS).text(`No depende de los filtros. Stock bajo: de 1 a ${informe.inventario.umbral} unidades.`);
    doc.moveDown(0.5);
    tabla(
      doc,
      [
        { titulo: 'Stock bajo', ancho: ancho - 110 },
        { titulo: 'Existencias', ancho: 110, alinear: 'right' }
      ],
      informe.inventario.stock_bajo.map((p) => [p.nombre, p.existencias]),
      'Ningún producto con stock bajo'
    );
    tabla(doc, [{ titulo: 'Agotados', ancho }], informe.inventario.agotados.map((p) => [p.nombre]), 'Ningún producto agotado');

    doc.end();
  });
}

module.exports = { generarPdf };

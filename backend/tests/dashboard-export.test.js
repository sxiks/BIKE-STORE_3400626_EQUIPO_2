// B4.1 · Pruebas de la exportación del informe (CU-18, decisión D11).
// El Excel se vuelve a leer con exceljs y sus cifras se comparan con /dashboard/metricas y /alertas.
// Contrato: docs/diseno-tecnico/API_CONTRATOS.md, "GET /dashboard/exportar".
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');
const app = require('../src/app.js');
const env = require('../src/config/env.js');
const { pool, limpiarUsuarios, fotoProductos, restaurarProductos } = require('./helpers/db.js');
const { registrarYEntrar, conToken } = require('./helpers/sesion.js');
const { comprar } = require('./helpers/compras.js');

const CLIENTE = { nombre: 'Ana Cliente', email: 'ana@prueba.local' };
const ADMIN = { nombre: 'Admin Tienda', email: 'admin@prueba.local' };
const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

let foto;
let ids;
let idCategoria;
let cliente;
let admin;
let token;

// Supertest no junta respuestas binarias por defecto: se recogen como Buffer.
function descargar(url, conSesion = token) {
  const req = request(app).get(url).buffer(true).parse((res, cb) => {
    const partes = [];
    res.on('data', (p) => partes.push(p));
    res.on('end', () => cb(null, Buffer.concat(partes)));
  });
  return conSesion ? req.set('Authorization', `Bearer ${conSesion}`) : req;
}

async function leerXlsx(buffer) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);
  return libro;
}

// Valor de la columna B de la fila cuya columna A tiene ese texto.
function valorDe(hoja, etiqueta) {
  let valor;
  hoja.eachRow((fila) => {
    if (fila.getCell(1).value === etiqueta) valor = fila.getCell(2).value;
  });
  return valor;
}

// Filas de la tabla de la sección `titulo` (sin su fila de encabezado), hasta la siguiente fila vacía.
function tablaDe(hoja, titulo) {
  const filas = [];
  let estado = 'buscando';
  hoja.eachRow({ includeEmpty: true }, (fila) => {
    const valores = fila.values.slice(1);
    if (estado === 'buscando') {
      if (fila.getCell(1).value === titulo) estado = 'encabezado';
    } else if (estado === 'encabezado') {
      estado = 'filas';
    } else if (estado === 'filas') {
      if (valores.every((x) => x === undefined || x === null || x === '')) estado = 'fin';
      else filas.push(valores);
    }
  });
  return filas;
}

const hoyEnColombia = () => new Intl.DateTimeFormat('en-CA', { timeZone: env.db.timezone }).format(new Date());

beforeAll(async () => {
  const productos = (await pool.query('SELECT id_producto, nombre FROM productos')).rows;
  ids = Object.fromEntries(productos.map((p) => [p.nombre, p.id_producto]));
  const categorias = (await pool.query('SELECT id_categoria, nombre FROM categorias')).rows;
  idCategoria = Object.fromEntries(categorias.map((c) => [c.nombre, c.id_categoria]));
});

beforeEach(async () => {
  await limpiarUsuarios();
  foto = await fotoProductos();
  await pool.query("UPDATE productos SET existencias = 100, estado = 'activo'");
  cliente = conToken(await registrarYEntrar(CLIENTE));
  token = await registrarYEntrar(ADMIN, 'admin');
  admin = conToken(token);
});

afterEach(async () => {
  await limpiarUsuarios();
  await restaurarProductos(foto);
});

describe('GET /api/dashboard/exportar?formato=xlsx', () => {
  it('descarga un Excel con nombre de archivo, hojas Resumen e Inventario y las mismas cifras del tablero', async () => {
    await comprar(cliente, [[ids['Luces LED recargables'], 2], [ids['Casco MTB Trail'], 1]]);
    await comprar(cliente, [[ids['Luces LED recargables'], 1]]);
    await comprar(cliente, [[ids['Candado en U reforzado'], 1]], { resultado: 'pendiente' }); // no cuenta
    await pool.query('UPDATE productos SET existencias = 2 WHERE id_producto = $1', [ids['Ruta Velox Carbono']]);
    await pool.query('UPDATE productos SET existencias = 0 WHERE id_producto = $1', [ids['Urbana Plegable 20']]);

    const res = await descargar('/api/dashboard/exportar?formato=xlsx');
    const metricas = (await admin.get('/api/dashboard/metricas')).body.data;

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe(TIPO_XLSX);
    expect(res.headers['content-disposition']).toBe(`attachment; filename="bike-store-informe-${hoyEnColombia()}.xlsx"`);
    expect(res.body.subarray(0, 2).toString()).toBe('PK'); // un .xlsx es un ZIP

    const libro = await leerXlsx(res.body);
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Resumen', 'Inventario']);

    const resumen = libro.getWorksheet('Resumen');
    expect(resumen.getCell('A1').value).toBe('Informe de ventas · Bike Store');
    expect(valorDe(resumen, 'Periodo')).toBe('Todo el historial');
    expect(valorDe(resumen, 'Categoría')).toBe('Todas');
    expect(valorDe(resumen, 'Ventas totales')).toBe(metricas.ventas_totales); // número, no texto
    expect(valorDe(resumen, 'Pedidos pagados')).toBe(metricas.cantidad_pedidos);
    expect(valorDe(resumen, 'Unidades vendidas')).toBe(metricas.unidades_vendidas);
    expect(tablaDe(resumen, 'Más vendidos')).toEqual(
      metricas.mas_vendidos.map((p) => [p.nombre, p.unidades, p.ventas])
    );

    const inventario = libro.getWorksheet('Inventario');
    expect(tablaDe(inventario, 'Stock bajo')).toEqual([['Ruta Velox Carbono', 2]]);
    expect(tablaDe(inventario, 'Agotados')).toEqual([['Urbana Plegable 20']]);
  });

  it('aplica los filtros: periodo y nombre de la categoría, con las cifras de /metricas para ese filtro', async () => {
    const cascos = idCategoria['Cascos y protección'];
    await comprar(cliente, [[ids['Casco MTB Trail'], 2], [ids['Luces LED recargables'], 1]], { fecha: '2026-03-10 12:00-05' });
    await comprar(cliente, [[ids['Casco Ruta Aero'], 1]], { fecha: '2026-04-01 12:00-05' }); // fuera del periodo
    const query = `desde=2026-03-01&hasta=2026-03-31&categoria=${cascos}`;

    const libro = await leerXlsx((await descargar(`/api/dashboard/exportar?formato=xlsx&${query}`)).body);
    const metricas = (await admin.get(`/api/dashboard/metricas?${query}`)).body.data;
    const resumen = libro.getWorksheet('Resumen');

    expect(valorDe(resumen, 'Periodo')).toBe('Del 2026-03-01 al 2026-03-31');
    expect(valorDe(resumen, 'Categoría')).toBe('Cascos y protección');
    expect(metricas.ventas_totales).toBe(498000);
    expect(valorDe(resumen, 'Ventas totales')).toBe(498000);
    expect(tablaDe(resumen, 'Más vendidos')).toEqual([['Casco MTB Trail', 2, 498000]]);
  });

  it('sin ventas ni alertas, el informe lo dice en lugar de dejar tablas vacías', async () => {
    const libro = await leerXlsx((await descargar('/api/dashboard/exportar?formato=xlsx')).body);

    expect(valorDe(libro.getWorksheet('Resumen'), 'Ventas totales')).toBe(0);
    expect(tablaDe(libro.getWorksheet('Resumen'), 'Más vendidos')).toEqual([['Sin ventas en el periodo']]);
    expect(tablaDe(libro.getWorksheet('Inventario'), 'Agotados')).toEqual([['Ningún producto agotado']]);
  });
});

describe('GET /api/dashboard/exportar?formato=pdf', () => {
  it('descarga un PDF completo con su nombre de archivo', async () => {
    await comprar(cliente, [[ids['Luces LED recargables'], 1]]);

    const res = await descargar(`/api/dashboard/exportar?formato=pdf&categoria=${idCategoria.Accesorios}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe(`attachment; filename="bike-store-informe-${hoyEnColombia()}.pdf"`);
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(res.body.subarray(-6).toString()).toContain('%%EOF');
    expect(Number(res.headers['content-length'])).toBe(res.body.length);
  });
});

describe('Errores de /api/dashboard/exportar', () => {
  it.each([
    ['sin formato', ''],
    ['con un formato no soportado', 'formato=csv'],
    ['con una fecha inválida', 'formato=pdf&desde=2026-13-01'],
    ['con "desde" posterior a "hasta"', 'formato=xlsx&desde=2026-03-02&hasta=2026-03-01'],
    ['con una categoría que no es un id', 'formato=xlsx&categoria=abc'],
    ['con una categoría que no existe', 'formato=xlsx&categoria=999999']
  ])('400 en JSON %s', async (_caso, query) => {
    const res = await admin.get(`/api/dashboard/exportar?${query}`);
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.headers['content-disposition']).toBeUndefined();
    expect(res.body.ok).toBe(false);
  });

  it('401 sin sesión y 403 para un cliente', async () => {
    expect((await request(app).get('/api/dashboard/exportar?formato=xlsx')).status).toBe(401);
    expect((await cliente.get('/api/dashboard/exportar?formato=xlsx')).status).toBe(403);
  });

  it('CORS deja leer Content-Disposition al frontend', async () => {
    const res = await descargar('/api/dashboard/exportar?formato=pdf').set('Origin', env.corsOrigin);
    expect(res.headers['access-control-expose-headers']).toBe('Content-Disposition');
  });
});

// B4.2 · Pruebas del tablero: CU-16 (alertas) y CU-17 (métricas con filtros).
// Ya cubiertos en carrito-pedido.test.js y no repetidos aquí: fecha_pedido frente a created_at, los
// carritos no cuentan en métricas ni en pendientes, e inactivos en carritos.
// Contrato: docs/diseno-tecnico/API_CONTRATOS.md, sección "Tablero".
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const app = require('../src/app.js');
const env = require('../src/config/env.js');
const { pool, limpiarUsuarios, fotoProductos, restaurarProductos } = require('./helpers/db.js');
const { registrarYEntrar, conToken } = require('./helpers/sesion.js');
const { comprar } = require('./helpers/compras.js');

const CLIENTE = { nombre: 'Ana Cliente', email: 'ana@prueba.local' };
const ADMIN = { nombre: 'Admin Tienda', email: 'admin@prueba.local' };

let foto;
let ids; // id por nombre de producto de la semilla
let idCategoria; // id por nombre de categoría
let cliente;
let admin;

const actualizar = (id, campos) => {
  const sets = Object.keys(campos).map((c, i) => `${c} = $${i + 2}`).join(', ');
  return pool.query(`UPDATE productos SET ${sets} WHERE id_producto = $1`, [id, ...Object.values(campos)]);
};

beforeAll(async () => {
  const productos = (await pool.query('SELECT id_producto, nombre FROM productos')).rows;
  ids = Object.fromEntries(productos.map((p) => [p.nombre, p.id_producto]));
  const categorias = (await pool.query('SELECT id_categoria, nombre FROM categorias')).rows;
  idCategoria = Object.fromEntries(categorias.map((c) => [c.nombre, c.id_categoria]));
});

beforeEach(async () => {
  await limpiarUsuarios();
  foto = await fotoProductos();
  // Existencias de sobra para comprar sin chocar con el stock de la semilla.
  await pool.query("UPDATE productos SET existencias = 100, estado = 'activo'");
  cliente = conToken(await registrarYEntrar(CLIENTE));
  admin = conToken(await registrarYEntrar(ADMIN, 'admin'));
});

afterEach(async () => {
  await limpiarUsuarios();
  await restaurarProductos(foto);
});

describe('GET /api/dashboard/metricas (CU-17)', () => {
  it('suma solo los pedidos pagados: los pendientes y los fallidos no cuentan', async () => {
    await comprar(cliente, [[ids['Luces LED recargables'], 2], [ids['Candado en U reforzado'], 1]]); // 253000
    await comprar(cliente, [[ids['Casco MTB Trail'], 1]], { resultado: 'pendiente' });
    await comprar(cliente, [[ids['Casco Ruta Aero'], 1]], { resultado: 'fallido' });

    const { data } = (await admin.get('/api/dashboard/metricas')).body;

    expect(data).toMatchObject({ ventas_totales: 253000, cantidad_pedidos: 1, unidades_vendidas: 3 });
    expect(data.filtros).toEqual({ desde: null, hasta: null, categoria: null });
  });

  it('las fechas son días de Colombia: un pedido de las 23:30 cuenta en ese día y no en el siguiente', async () => {
    // 23:30 en Colombia = 04:30 del día siguiente en UTC.
    await comprar(cliente, [[ids['Luces LED recargables'], 1]], { fecha: '2026-03-15 23:30-05' });

    const dia15 = (await admin.get('/api/dashboard/metricas?desde=2026-03-15&hasta=2026-03-15')).body.data;
    const dia16 = (await admin.get('/api/dashboard/metricas?desde=2026-03-16&hasta=2026-03-16')).body.data;
    const hasta15 = (await admin.get('/api/dashboard/metricas?hasta=2026-03-15')).body.data;

    expect(dia15.cantidad_pedidos).toBe(1);
    expect(dia16.cantidad_pedidos).toBe(0);
    expect(hasta15.cantidad_pedidos).toBe(1); // "hasta" incluye el día completo
  });

  it('el filtro por categoría cuenta solo las líneas de esa categoría', async () => {
    // Un pedido mixto: casco (Cascos y protección) + luces (Accesorios).
    await comprar(cliente, [[ids['Casco MTB Trail'], 1], [ids['Luces LED recargables'], 3]]);

    const cascos = (await admin.get(`/api/dashboard/metricas?categoria=${idCategoria['Cascos y protección']}`)).body.data;
    const urbanas = (await admin.get(`/api/dashboard/metricas?categoria=${idCategoria['Bicicletas urbanas']}`)).body.data;

    expect(cascos).toMatchObject({ ventas_totales: 249000, cantidad_pedidos: 1, unidades_vendidas: 1 });
    expect(cascos.mas_vendidos.map((p) => p.nombre)).toEqual(['Casco MTB Trail']);
    expect(cascos.filtros.categoria).toBe(idCategoria['Cascos y protección']);
    expect(urbanas).toMatchObject({ ventas_totales: 0, cantidad_pedidos: 0, unidades_vendidas: 0, mas_vendidos: [] });
  });

  it('más vendidos: máximo 5, por unidades y, si empatan, por ventas', async () => {
    await comprar(cliente, [
      [ids['Luces LED recargables'], 6],
      [ids['Candado en U reforzado'], 5],
      [ids['Casco Ruta Aero'], 3], // empata con el casco MTB en unidades, pero vende más
      [ids['Casco MTB Trail'], 3],
      [ids['Bomba de piso'], 2],
      [ids['Urbana Ciudad 700c'], 1]
    ]);

    const { mas_vendidos } = (await admin.get('/api/dashboard/metricas')).body.data;

    expect(mas_vendidos.map((p) => [p.nombre, p.unidades])).toEqual([
      ['Luces LED recargables', 6],
      ['Candado en U reforzado', 5],
      ['Casco Ruta Aero', 3],
      ['Casco MTB Trail', 3],
      ['Bomba de piso', 2]
    ]);
    expect(mas_vendidos[0]).toMatchObject({ id_producto: ids['Luces LED recargables'], ventas: 474000 });
  });

  it.each([
    ['fecha con formato inválido', 'desde=15-03-2026'],
    ['"desde" posterior a "hasta"', 'desde=2026-03-16&hasta=2026-03-15'],
    ['categoría que no es un id', 'categoria=abc']
  ])('400 con %s', async (_caso, query) => {
    const res = await admin.get(`/api/dashboard/metricas?${query}`);
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('GET /api/dashboard/alertas (CU-16)', () => {
  it(`stock bajo usa el umbral (${env.stockBajoUmbral}); los agotados y los inactivos van aparte`, async () => {
    const u = env.stockBajoUmbral;
    await actualizar(ids['MTB Páramo 27.5'], { existencias: u }); // en el umbral: sí
    await actualizar(ids['Ruta Velox Carbono'], { existencias: 1 }); // sí
    await actualizar(ids['MTB Sierra 29'], { existencias: u + 1 }); // por encima: no
    await actualizar(ids['Urbana Plegable 20'], { existencias: 0 }); // agotado
    await actualizar(ids['Bomba de piso'], { existencias: 1, estado: 'inactivo' }); // inactivo: no
    await actualizar(ids['Casco MTB Trail'], { existencias: 0, estado: 'inactivo' }); // inactivo: no

    const { data } = (await admin.get('/api/dashboard/alertas')).body;

    expect(data.umbral_stock_bajo).toBe(u);
    expect(data.stock_bajo).toEqual([
      { id_producto: ids['Ruta Velox Carbono'], nombre: 'Ruta Velox Carbono', existencias: 1 },
      { id_producto: ids['MTB Páramo 27.5'], nombre: 'MTB Páramo 27.5', existencias: u }
    ]);
    expect(data.agotados).toEqual([{ id_producto: ids['Urbana Plegable 20'], nombre: 'Urbana Plegable 20' }]);
  });

  it('lista los pedidos pendientes y fallidos (sin pagados ni carritos), del más reciente al más antiguo', async () => {
    const viejo = await comprar(cliente, [[ids['Luces LED recargables'], 1]], { resultado: 'pendiente', fecha: '2026-03-01 10:00-05' });
    const nuevo = await comprar(cliente, [[ids['Luces LED recargables'], 1]], { resultado: 'pendiente', fecha: '2026-03-02 10:00-05' });
    const fallido = await comprar(cliente, [[ids['Casco MTB Trail'], 1]], { resultado: 'fallido' });
    await comprar(cliente, [[ids['Casco Ruta Aero'], 1]]); // pagado
    await cliente.post('/api/carrito/items', { id_producto: ids['Bomba de piso'], cantidad: 1 }); // carrito abierto

    const { data } = (await admin.get('/api/dashboard/alertas')).body;

    expect(data.pedidos_pendientes.map((p) => p.numero_pedido)).toEqual([nuevo.numero_pedido, viejo.numero_pedido]);
    expect(data.pedidos_fallidos.map((p) => p.numero_pedido)).toEqual([fallido.numero_pedido]);
  });
});

describe('Acceso al tablero', () => {
  it.each(['/api/dashboard/metricas', '/api/dashboard/alertas'])('%s: 401 sin sesión y 403 para un cliente', async (url) => {
    expect((await request(app).get(url)).status).toBe(401);
    expect((await cliente.get(url)).status).toBe(403);
  });
});

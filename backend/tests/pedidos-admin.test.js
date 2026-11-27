// B4 · Pruebas del listado de pedidos para el admin (decisión N): GET /api/pedidos/admin.
// Contrato: docs/diseno-tecnico/API_CONTRATOS.md, "GET /pedidos/admin".
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const app = require('../src/app.js');
const { pool, limpiarUsuarios, fotoProductos, restaurarProductos } = require('./helpers/db.js');
const { registrarYEntrar, conToken } = require('./helpers/sesion.js');
const { comprar } = require('./helpers/compras.js');

const ANA = { nombre: 'Ana Cliente', email: 'ana@prueba.local' };
const LUIS = { nombre: 'Luis Pérez', email: 'luis_100%@prueba.local' };
const ADMIN = { nombre: 'Admin Tienda', email: 'admin@prueba.local' };

let foto;
let ids;
let ana;
let luis;
let admin;

const listar = async (query = '') => {
  const res = await admin.get(`/api/pedidos/admin${query ? `?${query}` : ''}`);
  expect(res.status).toBe(200);
  return res.body.data;
};
const numeros = (pedidos) => pedidos.map((p) => p.numero_pedido);

beforeAll(async () => {
  const productos = (await pool.query('SELECT id_producto, nombre FROM productos')).rows;
  ids = Object.fromEntries(productos.map((p) => [p.nombre, p.id_producto]));
});

beforeEach(async () => {
  await limpiarUsuarios();
  foto = await fotoProductos();
  await pool.query("UPDATE productos SET existencias = 100, estado = 'activo'");
  ana = conToken(await registrarYEntrar(ANA));
  luis = conToken(await registrarYEntrar(LUIS));
  admin = conToken(await registrarYEntrar(ADMIN, 'admin'));
});

afterEach(async () => {
  await limpiarUsuarios();
  await restaurarProductos(foto);
});

describe('GET /api/pedidos/admin', () => {
  it('lista los pedidos confirmados de todos los clientes, sin carritos, del más reciente al más antiguo', async () => {
    const a1 = await comprar(ana, [[ids['Luces LED recargables'], 2], [ids['Casco MTB Trail'], 1]], { fecha: '2026-03-01 10:00-05' });
    const l1 = await comprar(luis, [[ids['Candado en U reforzado'], 1]], { resultado: 'fallido', fecha: '2026-03-03 10:00-05' });
    const a2 = await comprar(ana, [[ids['Casco Ruta Aero'], 1]], { resultado: 'pendiente', fecha: '2026-03-02 10:00-05' });
    await luis.post('/api/carrito/items', { id_producto: ids['Bomba de piso'], cantidad: 1 }); // carrito: no se lista

    const pedidos = await listar();

    expect(numeros(pedidos)).toEqual([l1.numero_pedido, a2.numero_pedido, a1.numero_pedido]);
    expect(pedidos[2]).toMatchObject({
      numero_pedido: a1.numero_pedido,
      estado: 'pagado',
      cliente_nombre: 'Ana Cliente',
      cliente_email: 'ana@prueba.local',
      total: 2 * 79000 + 249000,
      unidades: 3,
      envio_ciudad: 'Palmira'
    });
    expect(pedidos[0]).toMatchObject({ estado: 'fallido', cliente_nombre: 'Luis Pérez' });
    expect(pedidos[0]).not.toHaveProperty('items');
    expect(pedidos[0]).not.toHaveProperty('pagos');
  });

  it('q busca, sin distinguir mayúsculas, en el número del pedido, el nombre y el correo del cliente', async () => {
    const a = await comprar(ana, [[ids['Luces LED recargables'], 1]]);
    const l = await comprar(luis, [[ids['Luces LED recargables'], 1]]);

    expect(numeros(await listar(`q=${encodeURIComponent(a.numero_pedido.toLowerCase())}`))).toEqual([a.numero_pedido]);
    expect(numeros(await listar('q=PÉREZ'))).toEqual([l.numero_pedido]);
    expect(numeros(await listar('q=ana%40prueba'))).toEqual([a.numero_pedido]);
    expect(await listar('q=nadie')).toEqual([]);
  });

  it('q busca % y _ como texto, no como comodines', async () => {
    await comprar(ana, [[ids['Luces LED recargables'], 1]]);
    const l = await comprar(luis, [[ids['Luces LED recargables'], 1]]);

    expect(numeros(await listar(`q=${encodeURIComponent('100%')}`))).toEqual([l.numero_pedido]);
    expect(numeros(await listar('q=_'))).toEqual([l.numero_pedido]); // solo el correo de Luis tiene "_"
  });

  it('filtra por estado y por días de Colombia (desde y hasta inclusivos)', async () => {
    const tarde = await comprar(ana, [[ids['Luces LED recargables'], 1]], { fecha: '2026-03-15 23:30-05' }); // 04:30 UTC del 16
    const pendiente = await comprar(ana, [[ids['Luces LED recargables'], 1]], { resultado: 'pendiente', fecha: '2026-03-16 08:00-05' });

    expect(numeros(await listar('estado=pendiente'))).toEqual([pendiente.numero_pedido]);
    expect(numeros(await listar('estado=pagado'))).toEqual([tarde.numero_pedido]);
    expect(numeros(await listar('desde=2026-03-15&hasta=2026-03-15'))).toEqual([tarde.numero_pedido]);
    expect(numeros(await listar('desde=2026-03-16'))).toEqual([pendiente.numero_pedido]);
    expect(numeros(await listar('estado=pagado&desde=2026-03-16'))).toEqual([]);
  });

  it.each([
    ['un estado que no existe', 'estado=enviado'],
    ['el estado carrito', 'estado=carrito'],
    ['una fecha inválida', 'desde=2026/03/01'],
    ['"desde" posterior a "hasta"', 'desde=2026-03-02&hasta=2026-03-01'],
    ['q de más de 100 caracteres', `q=${'a'.repeat(101)}`]
  ])('400 con %s', async (_caso, query) => {
    const res = await admin.get(`/api/pedidos/admin?${query}`);
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('401 sin sesión y 403 para un cliente (la ruta no se confunde con /pedidos/:numero)', async () => {
    expect((await request(app).get('/api/pedidos/admin')).status).toBe(401);
    expect((await ana.get('/api/pedidos/admin')).status).toBe(403);
  });
});

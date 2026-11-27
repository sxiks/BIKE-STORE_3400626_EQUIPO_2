// B3.2 · Pruebas de pedidos y pago simulado: CU-07, CU-08, R3–R5 y decisiones D, E, F, K y 10.
// Confirmar el carrito lo convierte en el pedido (D12). Los casos ya cubiertos en carrito-pedido.test.js
// (confirmar sin carrito, producto inactivo, refresco de precio al confirmar, pagar un carrito, rechazo y
// reintento básico, concurrencia de confirmar) no se repiten aquí.
// Contrato: docs/diseno-tecnico/API_CONTRATOS.md, sección "Pedidos y pago · cliente".
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const app = require('../src/app.js');
const { pool, limpiarUsuarios, fotoProductos, restaurarProductos } = require('./helpers/db.js');
const { registrarYEntrar, conToken } = require('./helpers/sesion.js');

const CLIENTE = { nombre: 'Ana Cliente', email: 'ana@prueba.local' };
const OTRO = { nombre: 'Luis Cliente', email: 'luis@prueba.local' };
const ADMIN = { nombre: 'Admin Tienda', email: 'admin@prueba.local' };
const ENVIO = {
  envio_nombre: 'Ana Cliente',
  envio_telefono: '3001234567',
  envio_departamento: 'Valle del Cauca',
  envio_ciudad: 'Palmira',
  envio_direccion: 'Calle 1 # 2-3'
};
const TARJETA_OK = { medio_pago: 'tarjeta_credito', numero: '4111 1111 1111 1111' };
const TARJETA_RECHAZO = { medio_pago: 'tarjeta_debito', numero: '4111-1111-1111-0000' }; // decisión D

let foto;
let api;
let p; // productos de la semilla elegidos por su situación

const existencias = async (id) =>
  (await pool.query('SELECT existencias FROM productos WHERE id_producto = $1', [id])).rows[0].existencias;
const pagosDe = async (idPedido) =>
  (await pool.query('SELECT medio_pago, ultimos4, valor, estado FROM pagos WHERE id_pedido = $1 ORDER BY id_pago', [idPedido])).rows;
const estadoDe = async (idPedido) =>
  (await pool.query('SELECT estado FROM pedidos WHERE id_pedido = $1', [idPedido])).rows[0].estado;
const actualizarProducto = (id, campos) => {
  const sets = Object.keys(campos).map((c, i) => `${c} = $${i + 2}`).join(', ');
  return pool.query(`UPDATE productos SET ${sets} WHERE id_producto = $1`, [id, ...Object.values(campos)]);
};

// Agrega las líneas al carrito del cliente y lo confirma. Devuelve el pedido (201).
async function comprar(lineas, cliente = api) {
  for (const [producto, cantidad] of lineas) {
    await cliente.post('/api/carrito/items', { id_producto: producto.id_producto, cantidad });
  }
  const res = await cliente.post('/api/pedidos', ENVIO);
  expect(res.status).toBe(201);
  return res.body.data;
}
const pagar = (pedido, datos = TARJETA_OK, cliente = api) => cliente.post(`/api/pedidos/${pedido.id_pedido}/pagos`, datos);

beforeAll(async () => {
  foto = await fotoProductos();
  const conStock = foto.filter((x) => x.estado === 'activo' && x.existencias >= 5).sort((a, b) => a.id_producto - b.id_producto);
  p = { a: conStock[0], b: conStock[1] };
});

beforeEach(async () => {
  await limpiarUsuarios();
  api = conToken(await registrarYEntrar(CLIENTE));
});

afterEach(async () => {
  await limpiarUsuarios();
  await restaurarProductos(foto);
});

describe('Confirmar el carrito · POST /pedidos (CU-07)', () => {
  it('sin token responde 401 y un admin 403', async () => {
    const admin = conToken(await registrarYEntrar(ADMIN, 'admin'));

    expect((await request(app).post('/api/pedidos').send(ENVIO)).status).toBe(401);
    expect((await admin.post('/api/pedidos', ENVIO)).status).toBe(403);
  });

  it('un carrito que existe pero quedó vacío responde 400 CARRITO_VACIO', async () => {
    await api.post('/api/carrito/items', { id_producto: p.a.id_producto });
    await api.del(`/api/carrito/items/${p.a.id_producto}`);

    const res = await api.post('/api/pedidos', ENVIO);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CARRITO_VACIO');
  });

  it.each(Object.keys(ENVIO))('sin %s responde 400 y el carrito sigue igual', async (campo) => {
    const { id_pedido: idPedido } = (await api.post('/api/carrito/items', { id_producto: p.a.id_producto })).body.data;

    const res = await api.post('/api/pedidos', { ...ENVIO, [campo]: '   ' });

    expect(res.status).toBe(400);
    expect(await estadoDe(idPedido)).toBe('carrito');
    expect((await api.get('/api/carrito')).body.data.items).toHaveLength(1);
  });

  it('con productos sin stock o que superan el stock responde 409 CARRITO_NO_DISPONIBLE con cada motivo', async () => {
    const { id_pedido: idPedido } = (await api.post('/api/carrito/items', { id_producto: p.a.id_producto, cantidad: 3 })).body.data;
    await api.post('/api/carrito/items', { id_producto: p.b.id_producto, cantidad: 1 });
    await actualizarProducto(p.a.id_producto, { existencias: 2 });
    await actualizarProducto(p.b.id_producto, { existencias: 0 });

    const res = await api.post('/api/pedidos', ENVIO);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CARRITO_NO_DISPONIBLE');
    expect(res.body.data.items).toEqual(
      expect.arrayContaining([
        { id_producto: p.a.id_producto, nombre: p.a.nombre, motivo: 'SUPERA_STOCK' },
        { id_producto: p.b.id_producto, nombre: p.b.nombre, motivo: 'SIN_STOCK' }
      ])
    );
    expect(await estadoDe(idPedido)).toBe('carrito');
  });

  it('crea el pedido pendiente con número BS-AAAA-NNNNNN del año actual, envío, líneas y total; no toca el stock', async () => {
    const pedido = await comprar([[p.a, 2], [p.b, 1]]);

    expect(pedido).toMatchObject({ estado: 'pendiente', ...ENVIO, total: p.a.precio * 2 + p.b.precio });
    expect(pedido.numero_pedido).toMatch(new RegExp(`^BS-${new Date().getFullYear()}-\\d{6}$`));
    expect(pedido.fecha_pedido).toBeTruthy();
    expect(pedido.items).toHaveLength(2);
    expect(pedido.pagos).toEqual([]);
    expect(await existencias(p.a.id_producto)).toBe(p.a.existencias);
  });

  it('dos pedidos seguidos tienen números distintos y consecutivos', async () => {
    const primero = await comprar([[p.a, 1]]);
    const segundo = await comprar([[p.b, 1]]);

    const n = (pedido) => Number(pedido.numero_pedido.slice(-6));
    expect(n(segundo)).toBe(n(primero) + 1);
  });

  it('R3: cambiar el precio del producto después de confirmar no altera el pedido', async () => {
    const pedido = await comprar([[p.a, 2]]);
    await actualizarProducto(p.a.id_producto, { precio: p.a.precio * 3 });

    const res = await api.get(`/api/pedidos/${pedido.numero_pedido}`);

    expect(res.body.data.items[0].precio_unitario).toBe(p.a.precio);
    expect(res.body.data.total).toBe(p.a.precio * 2);
  });
});

describe('Pagar · POST /pedidos/:id/pagos (CU-08)', () => {
  let pedido;

  beforeEach(async () => {
    pedido = await comprar([[p.a, 2]]);
  });

  it.each([
    ['medio de pago inválido', { medio_pago: 'efectivo', numero: '4111111111111111' }],
    ['tarjeta con 12 dígitos', { medio_pago: 'tarjeta_credito', numero: '411111111111' }],
    ['tarjeta con 20 dígitos', { medio_pago: 'tarjeta_debito', numero: '41111111111111111111' }],
    ['cuenta con 5 dígitos', { medio_pago: 'cuenta_bancaria', numero: '12345' }],
    ['número con letras', { medio_pago: 'tarjeta_credito', numero: '4111abcd11111111' }],
    ['sin número', { medio_pago: 'tarjeta_credito' }]
  ])('datos inválidos (%s) responden 400 sin registrar pago', async (_caso, datos) => {
    expect((await pagar(pedido, datos)).status).toBe(400);
    expect(await pagosDe(pedido.id_pedido)).toEqual([]);
    expect(await estadoDe(pedido.id_pedido)).toBe('pendiente');
  });

  it('aprobado: 201, pedido pagado, stock descontado y solo los últimos 4 dígitos guardados (R5)', async () => {
    const res = await pagar(pedido);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ numero_pedido: pedido.numero_pedido, estado: 'pagado', valor_pagado: pedido.total });
    expect(res.body.data.pago).toMatchObject({ medio_pago: 'tarjeta_credito', ultimos4: '1111', estado: 'aprobado' });
    expect(JSON.stringify(res.body)).not.toContain('41111111');
    expect(await existencias(p.a.id_producto)).toBe(p.a.existencias - 2);
    expect(await pagosDe(pedido.id_pedido)).toEqual([
      { medio_pago: 'tarjeta_credito', ultimos4: '1111', valor: pedido.total, estado: 'aprobado' }
    ]);

    const detalle = (await api.get(`/api/pedidos/${pedido.numero_pedido}`)).body.data;
    expect(detalle.estado).toBe('pagado');
    expect(detalle.pagos).toHaveLength(1);
  });

  it('una cuenta bancaria de 6 a 20 dígitos se acepta', async () => {
    const res = await pagar(pedido, { medio_pago: 'cuenta_bancaria', numero: '123456' });

    expect(res.status).toBe(201);
    expect(res.body.data.pago.ultimos4).toBe('3456');
  });

  it('rechazado (termina en 0000): 402 PAGO_RECHAZADO, pedido fallido y el stock NO se descuenta (decisión D)', async () => {
    const res = await pagar(pedido, TARJETA_RECHAZO);

    expect(res.status).toBe(402);
    expect(res.body).toMatchObject({ ok: false, code: 'PAGO_RECHAZADO' });
    expect(res.body.data).toMatchObject({ estado: 'fallido', numero_pedido: pedido.numero_pedido });
    expect(await existencias(p.a.id_producto)).toBe(p.a.existencias);
    expect(await pagosDe(pedido.id_pedido)).toEqual([
      { medio_pago: 'tarjeta_debito', ultimos4: '0000', valor: pedido.total, estado: 'rechazado' }
    ]);
  });

  it('reintento aprobado sobre el pedido fallido: guarda los dos intentos y descuenta el stock una vez (decisión F)', async () => {
    await pagar(pedido, TARJETA_RECHAZO);

    const res = await pagar(pedido);

    expect(res.status).toBe(201);
    expect((await pagosDe(pedido.id_pedido)).map((x) => x.estado)).toEqual(['rechazado', 'aprobado']);
    expect(await existencias(p.a.id_producto)).toBe(p.a.existencias - 2);
  });

  it('un segundo pago sobre un pedido pagado responde 409 PEDIDO_YA_PAGADO y no registra nada', async () => {
    await pagar(pedido);

    const res = await pagar(pedido);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PEDIDO_YA_PAGADO');
    expect(await pagosDe(pedido.id_pedido)).toHaveLength(1);
    expect(await existencias(p.a.id_producto)).toBe(p.a.existencias - 2);
  });

  it('decisión E: si el stock bajó entre confirmar y pagar, responde 409 SIN_STOCK, no registra pago y el pedido sigue pendiente', async () => {
    await actualizarProducto(p.a.id_producto, { existencias: 1 });

    const res = await pagar(pedido);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SIN_STOCK');
    expect(res.body.data.items).toEqual([
      { id_producto: p.a.id_producto, nombre: p.a.nombre, motivo: 'SIN_STOCK', disponibles: 1 }
    ]);
    expect(await pagosDe(pedido.id_pedido)).toEqual([]);
    expect(await estadoDe(pedido.id_pedido)).toBe('pendiente');
    expect(await existencias(p.a.id_producto)).toBe(1);
  });

  it('decisión E: un producto inactivado después de confirmar también bloquea el pago (motivo INACTIVO)', async () => {
    await actualizarProducto(p.a.id_producto, { estado: 'inactivo' });

    const res = await pagar(pedido);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SIN_STOCK');
    expect(res.body.data.items[0]).toMatchObject({ id_producto: p.a.id_producto, motivo: 'INACTIVO' });
    expect(await pagosDe(pedido.id_pedido)).toEqual([]);
  });

  it('decisión E sobre un pedido fallido: sigue fallido y se puede pagar cuando vuelve el stock', async () => {
    await pagar(pedido, TARJETA_RECHAZO);
    await actualizarProducto(p.a.id_producto, { existencias: 1 });

    expect((await pagar(pedido)).status).toBe(409);
    expect(await estadoDe(pedido.id_pedido)).toBe('fallido');

    await actualizarProducto(p.a.id_producto, { existencias: 5 });
    expect((await pagar(pedido)).status).toBe(201);
    expect(await existencias(p.a.id_producto)).toBe(3);
  });

  it('un pedido inexistente responde 404 y un id inválido 400', async () => {
    expect((await api.post('/api/pedidos/999999/pagos', TARJETA_OK)).status).toBe(404);
    expect((await api.post('/api/pedidos/abc/pagos', TARJETA_OK)).status).toBe(400);
  });
});

describe('Acceso a los pedidos', () => {
  let pedido;
  let otro;
  let admin;

  beforeEach(async () => {
    pedido = await comprar([[p.a, 1]]);
    otro = conToken(await registrarYEntrar(OTRO));
    admin = conToken(await registrarYEntrar(ADMIN, 'admin'));
  });

  it('otro cliente no ve ni paga el pedido: 404 (no revela que existe)', async () => {
    expect((await otro.get(`/api/pedidos/${pedido.numero_pedido}`)).status).toBe(404);
    expect((await pagar(pedido, TARJETA_OK, otro)).status).toBe(404);
    expect(await pagosDe(pedido.id_pedido)).toEqual([]);
    expect((await otro.get('/api/pedidos')).body.data).toEqual([]);
  });

  it('el admin ve cualquier pedido por su número, pero no puede pagarlo ni listar "mis pedidos" (K)', async () => {
    const res = await admin.get(`/api/pedidos/${pedido.numero_pedido}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ numero_pedido: pedido.numero_pedido, items: [expect.objectContaining({ id_producto: p.a.id_producto })] });
    expect((await pagar(pedido, TARJETA_OK, admin)).status).toBe(403);
    expect((await admin.get('/api/pedidos')).status).toBe(403);
  });

  it('un número que no existe responde 404, también para el admin', async () => {
    expect((await api.get('/api/pedidos/BS-2000-999999')).status).toBe(404);
    expect((await admin.get('/api/pedidos/no-es-un-numero')).status).toBe(404);
  });

  it('GET /pedidos lista los del cliente del más reciente al más antiguo, sin líneas ni pagos', async () => {
    const segundo = await comprar([[p.b, 1]]);

    const res = await api.get('/api/pedidos');

    expect(res.body.data.map((x) => x.numero_pedido)).toEqual([segundo.numero_pedido, pedido.numero_pedido]);
    expect(res.body.data[0]).not.toHaveProperty('items');
    expect(res.body.data[0]).not.toHaveProperty('pagos');
  });
});

describe('Concurrencia del pago (decisión 10)', () => {
  it('dos clientes pagan al mismo tiempo la última unidad: solo uno se aprueba y el stock nunca queda negativo', async () => {
    const otro = conToken(await registrarYEntrar(OTRO));
    await actualizarProducto(p.a.id_producto, { existencias: 1 });
    const mio = await comprar([[p.a, 1]]);
    const suyo = await comprar([[p.a, 1]], otro); // confirmar no descuenta stock: los dos pedidos existen

    const respuestas = await Promise.all([pagar(mio), pagar(suyo, TARJETA_OK, otro)]);

    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(respuestas.find((r) => r.status === 409).body.code).toBe('SIN_STOCK');
    expect(await existencias(p.a.id_producto)).toBe(0);
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM pagos WHERE estado = 'aprobado'");
    expect(rows[0].n).toBe(1);
  });

  it('doble clic en pagar el mismo pedido: un pago aprobado y el otro 409 PEDIDO_YA_PAGADO; el stock baja una vez', async () => {
    const pedido = await comprar([[p.a, 2]]);

    const respuestas = await Promise.all([pagar(pedido), pagar(pedido)]);

    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(respuestas.find((r) => r.status === 409).body.code).toBe('PEDIDO_YA_PAGADO');
    expect(await pagosDe(pedido.id_pedido)).toHaveLength(1);
    expect(await existencias(p.a.id_producto)).toBe(p.a.existencias - 2);
  });
});

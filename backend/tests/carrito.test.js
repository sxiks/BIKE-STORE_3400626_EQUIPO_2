// B3.1 · Pruebas del carrito del cliente: CU-03 a CU-07, R2, D1, D4 y K.
// El carrito es el pedido del cliente en estado 'carrito' (D12). El modelo (un solo carrito, sumar en la misma
// línea, cantidad 0, producto inactivo marcado, confirmar y concurrencia) ya está en carrito-pedido.test.js:
// aquí se cubre el contrato de cada endpoint sin repetir esos casos.
// Contrato: docs/diseno-tecnico/API_CONTRATOS.md, sección "Carrito · cliente".
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const app = require('../src/app.js');
const { pool, limpiarUsuarios, fotoProductos, restaurarProductos } = require('./helpers/db.js');
const { PASSWORD, registrarYEntrar, conToken } = require('./helpers/sesion.js');

const CLIENTE = { nombre: 'Ana Cliente', email: 'ana@prueba.local' };
const OTRO = { nombre: 'Luis Cliente', email: 'luis@prueba.local' };
const ADMIN = { nombre: 'Admin Tienda', email: 'admin@prueba.local' };

let foto;
let api; // cliente con sesión
let p;   // productos de la semilla elegidos por su situación

const carrito = async (cliente = api) => (await cliente.get('/api/carrito')).body.data;
const agregar = (id, cantidad, cliente = api) =>
  cliente.post('/api/carrito/items', cantidad === undefined ? { id_producto: id } : { id_producto: id, cantidad });
const cambiar = (id, cantidad) => api.put(`/api/carrito/items/${id}`, { cantidad });
const quitar = (id) => api.del(`/api/carrito/items/${id}`);
const actualizarProducto = (id, campos) => {
  const sets = Object.keys(campos).map((c, i) => `${c} = $${i + 2}`).join(', ');
  return pool.query(`UPDATE productos SET ${sets} WHERE id_producto = $1`, [id, ...Object.values(campos)]);
};

beforeAll(async () => {
  foto = await fotoProductos();
  const activos = foto.filter((x) => x.estado === 'activo');
  const conStock = activos.filter((x) => x.existencias >= 5).sort((a, b) => a.id_producto - b.id_producto);
  p = {
    mucho: conStock[0],                                                    // varias unidades libres
    otro: conStock[1],                                                     // un segundo producto para totales
    poco: activos.filter((x) => x.existencias >= 2).sort((a, b) => a.existencias - b.existencias)[0],
    agotado: activos.find((x) => x.existencias === 0),
    inactivo: foto.find((x) => x.estado === 'inactivo')
  };
});

beforeEach(async () => {
  await limpiarUsuarios();
  api = conToken(await registrarYEntrar(CLIENTE));
});

afterEach(async () => {
  await limpiarUsuarios();
  await restaurarProductos(foto);
});

describe('Acceso (D1, K)', () => {
  it('sin token las cuatro rutas responden 401', async () => {
    expect((await request(app).get('/api/carrito')).status).toBe(401);
    expect((await request(app).post('/api/carrito/items').send({ id_producto: p.mucho.id_producto })).status).toBe(401);
    expect((await request(app).put(`/api/carrito/items/${p.mucho.id_producto}`).send({ cantidad: 2 })).status).toBe(401);
    expect((await request(app).delete(`/api/carrito/items/${p.mucho.id_producto}`)).status).toBe(401);
  });

  it('un admin recibe 403 en las cuatro rutas y no se le crea carrito', async () => {
    const admin = conToken(await registrarYEntrar(ADMIN, 'admin'));

    expect((await admin.get('/api/carrito')).status).toBe(403);
    expect((await agregar(p.mucho.id_producto, 1, admin)).status).toBe(403);
    expect((await admin.put(`/api/carrito/items/${p.mucho.id_producto}`, { cantidad: 2 })).status).toBe(403);
    expect((await admin.del(`/api/carrito/items/${p.mucho.id_producto}`)).status).toBe(403);
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM pedidos WHERE estado = 'carrito'");
    expect(rows[0].n).toBe(0);
  });
});

describe('Agregar · CU-03', () => {
  it('sin cantidad agrega 1; con cantidad agrega esa', async () => {
    const uno = await agregar(p.mucho.id_producto);
    expect(uno.status).toBe(200);
    expect(uno.body.data.items[0]).toMatchObject({ id_producto: p.mucho.id_producto, cantidad: 1 });

    const tres = await agregar(p.otro.id_producto, 3);
    expect(tres.body.data.items.find((i) => i.id_producto === p.otro.id_producto).cantidad).toBe(3);
    expect(tres.body.data.total_unidades).toBe(4);
  });

  it('pedir más de las existencias de una vez responde 400 STOCK_MAXIMO con el máximo y no crea el carrito', async () => {
    const res = await agregar(p.poco.id_producto, p.poco.existencias + 1);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('STOCK_MAXIMO');
    expect(res.body.data).toEqual({ maximo: p.poco.existencias, en_carrito: 0 });
    expect((await carrito()).id_pedido).toBeNull();
  });

  it('sumar a lo que ya está en el carrito sin pasar del stock: STOCK_MAXIMO dice cuánto hay y el carrito no cambia', async () => {
    await agregar(p.poco.id_producto, p.poco.existencias - 1);

    const res = await agregar(p.poco.id_producto, 2);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('STOCK_MAXIMO');
    expect(res.body.data).toEqual({ maximo: p.poco.existencias, en_carrito: p.poco.existencias - 1 });
    expect((await carrito()).items[0].cantidad).toBe(p.poco.existencias - 1);
    // Completar exactamente hasta el máximo sí se permite.
    expect((await agregar(p.poco.id_producto, 1)).body.data.items[0].cantidad).toBe(p.poco.existencias);
  });

  it('un producto agotado responde 400 SIN_STOCK y uno inactivo 400 PRODUCTO_INACTIVO', async () => {
    const agotado = await agregar(p.agotado.id_producto);
    const inactivo = await agregar(p.inactivo.id_producto);

    expect(agotado.status).toBe(400);
    expect(agotado.body.code).toBe('SIN_STOCK');
    expect(inactivo.status).toBe(400);
    expect(inactivo.body.code).toBe('PRODUCTO_INACTIVO');
    expect((await carrito()).id_pedido).toBeNull();
  });

  it('un producto inexistente responde 404', async () => {
    expect((await agregar(999999)).status).toBe(404);
  });

  it.each([
    ['sin id_producto', () => ({})],
    ['id_producto de texto', () => ({ id_producto: 'abc' })],
    ['cantidad 0', () => ({ id_producto: p.mucho.id_producto, cantidad: 0 })],
    ['cantidad negativa', () => ({ id_producto: p.mucho.id_producto, cantidad: -2 })],
    ['cantidad decimal', () => ({ id_producto: p.mucho.id_producto, cantidad: 1.5 })],
    ['cantidad de texto', () => ({ id_producto: p.mucho.id_producto, cantidad: 'dos' })]
  ])('datos inválidos (%s) responden 400 y no crean el carrito', async (_caso, cuerpo) => {
    const res = await api.post('/api/carrito/items', cuerpo());

    expect(res.status).toBe(400);
    expect((await carrito()).id_pedido).toBeNull();
  });
});

describe('Modificar · CU-05', () => {
  beforeEach(async () => {
    await agregar(p.mucho.id_producto, 1);
  });

  it('fija la cantidad (no la suma) y recalcula los totales', async () => {
    const res = await cambiar(p.mucho.id_producto, 3);

    expect(res.status).toBe(200);
    expect(res.body.data.items[0]).toMatchObject({ cantidad: 3, subtotal: p.mucho.precio * 3 });
    expect(res.body.data).toMatchObject({ total_unidades: 3, total: p.mucho.precio * 3 });
  });

  it.each([[-1], [2.5], ['tres']])('una cantidad inválida (%j) responde 400 y no cambia nada', async (cantidad) => {
    expect((await cambiar(p.mucho.id_producto, cantidad)).status).toBe(400);
    expect((await carrito()).items[0].cantidad).toBe(1);
  });

  it('por encima de las existencias responde 400 STOCK_MAXIMO con el máximo', async () => {
    const res = await cambiar(p.mucho.id_producto, p.mucho.existencias + 1);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('STOCK_MAXIMO');
    expect(res.body.data.maximo).toBe(p.mucho.existencias);
    expect((await carrito()).items[0].cantidad).toBe(1);
  });

  it('un producto que no está en el carrito responde 404 (aunque el cliente sí tenga carrito)', async () => {
    const res = await cambiar(p.otro.id_producto, 2);

    expect(res.status).toBe(404);
    expect((await carrito()).items).toHaveLength(1);
  });
});

describe('Eliminar', () => {
  it('se puede quitar un producto que se inactivó después de agregarlo (D4)', async () => {
    await agregar(p.mucho.id_producto, 2);
    await agregar(p.otro.id_producto, 1);
    await actualizarProducto(p.mucho.id_producto, { estado: 'inactivo' });

    const res = await quitar(p.mucho.id_producto);

    expect(res.status).toBe(200);
    expect(res.body.data.items.map((i) => i.id_producto)).toEqual([p.otro.id_producto]);
    expect(res.body.data.puede_comprar).toBe(true);
  });

  it('un producto que no está en el carrito responde 404', async () => {
    await agregar(p.mucho.id_producto);

    expect((await quitar(p.otro.id_producto)).status).toBe(404);
  });

  it('quitar el último deja el carrito vacío pero conserva el pedido en estado carrito', async () => {
    const { id_pedido: idPedido } = (await agregar(p.mucho.id_producto)).body.data;

    const res = await quitar(p.mucho.id_producto);

    expect(res.body.data).toMatchObject({ id_pedido: idPedido, items: [], total: 0, total_unidades: 0, puede_comprar: false });
    const { rows } = await pool.query('SELECT estado FROM pedidos WHERE id_pedido = $1', [idPedido]);
    expect(rows[0].estado).toBe('carrito');
  });
});

describe('Consultar · CU-04, CU-06, CU-07', () => {
  it('calcula subtotales, total y unidades con varias líneas', async () => {
    await agregar(p.mucho.id_producto, 2);
    await agregar(p.otro.id_producto, 3);

    const datos = await carrito();

    expect(datos.items).toHaveLength(2);
    for (const item of datos.items) expect(item.subtotal).toBe(item.precio * item.cantidad);
    expect(datos.total).toBe(p.mucho.precio * 2 + p.otro.precio * 3);
    expect(datos.total_unidades).toBe(5);
    expect(datos.puede_comprar).toBe(true);
    expect(datos.items.every((i) => i.disponible && i.motivo === null)).toBe(true);
  });

  it('muestra el precio actual: si el admin lo cambia, el carrito lo refleja', async () => {
    await agregar(p.mucho.id_producto, 2);
    const nuevo = p.mucho.precio + 1000;
    await actualizarProducto(p.mucho.id_producto, { precio: nuevo });

    const datos = await carrito();

    expect(datos.items[0]).toMatchObject({ precio: nuevo, subtotal: nuevo * 2 });
    expect(datos.total).toBe(nuevo * 2);
  });

  it('si el stock baja a 0 después de agregar, el ítem queda SIN_STOCK y bloquea la compra', async () => {
    await agregar(p.mucho.id_producto, 2);
    await actualizarProducto(p.mucho.id_producto, { existencias: 0 });

    const datos = await carrito();

    expect(datos.items[0]).toMatchObject({ disponible: false, motivo: 'SIN_STOCK' });
    expect(datos.puede_comprar).toBe(false);
  });

  it('si el stock baja por debajo de la cantidad elegida, el ítem queda SUPERA_STOCK', async () => {
    await agregar(p.mucho.id_producto, 3);
    await actualizarProducto(p.mucho.id_producto, { existencias: 2 });

    const datos = await carrito();

    expect(datos.items[0]).toMatchObject({ disponible: false, motivo: 'SUPERA_STOCK', existencias: 2, cantidad: 3 });
    expect(datos.puede_comprar).toBe(false);
    // Bajar la cantidad hasta lo disponible lo deja comprable otra vez.
    expect((await cambiar(p.mucho.id_producto, 2)).body.data.puede_comprar).toBe(true);
  });

  it('un carrito vacío no se puede comprar', async () => {
    expect(await carrito()).toMatchObject({ id_pedido: null, items: [], total: 0, total_unidades: 0, puede_comprar: false });
  });

  it('el carrito se conserva al cerrar sesión y volver a entrar (CU-06)', async () => {
    await agregar(p.mucho.id_producto, 2);

    const login = await request(app).post('/api/auth/login').send({ email: CLIENTE.email, password: PASSWORD });
    const otraSesion = conToken(login.body.data.token);

    const datos = await carrito(otraSesion);
    expect(datos.items).toEqual([expect.objectContaining({ id_producto: p.mucho.id_producto, cantidad: 2 })]);
  });

  it('cada cliente ve solo su carrito', async () => {
    await agregar(p.mucho.id_producto, 2);
    const otro = conToken(await registrarYEntrar(OTRO));
    await agregar(p.otro.id_producto, 1, otro);

    expect((await carrito()).items.map((i) => i.id_producto)).toEqual([p.mucho.id_producto]);
    expect((await carrito(otro)).items.map((i) => i.id_producto)).toEqual([p.otro.id_producto]);
    // Y no puede tocar el del otro: para él, ese producto no está en su carrito.
    expect((await otro.put(`/api/carrito/items/${p.mucho.id_producto}`, { cantidad: 1 })).status).toBe(404);
    expect((await otro.del(`/api/carrito/items/${p.mucho.id_producto}`)).status).toBe(404);
    expect((await carrito()).items[0].cantidad).toBe(2);
  });
});

// Pruebas del carrito como pedido en estado 'carrito' (migraciones 004 y 005).
// Cubren el modelo nuevo; las tareas B3.1 (carrito) y B3.2 (pedidos y pago) amplían estos casos.
// Contratos: docs/diseno-tecnico/API_CONTRATOS.md, secciones "Carrito", "Pedidos y pago" y "Tablero".
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const app = require('../src/app.js');
const { pool, limpiarUsuarios, cambiarRolUsuario } = require('./helpers/db.js');

const PASSWORD = 'Clave1234';
const CLIENTE = { nombre: 'Ana Cliente', email: 'ana@prueba.local', password: PASSWORD };
const ADMIN = { nombre: 'Admin Tienda', email: 'admin@prueba.local', password: PASSWORD };
const ENVIO = {
  envio_nombre: 'Ana Cliente',
  envio_telefono: '3001234567',
  envio_departamento: 'Valle del Cauca',
  envio_ciudad: 'Palmira',
  envio_direccion: 'Calle 1 # 2-3'
};
const TARJETA_OK = { medio_pago: 'tarjeta_debito', numero: '4111111111111111' };
const TARJETA_RECHAZO = { medio_pago: 'tarjeta_debito', numero: '4111111111110000' };

let productosOriginales;
let ids;

async function tokenDe(usuario, rol) {
  await request(app).post('/api/auth/register').send(usuario);
  if (rol) await cambiarRolUsuario(usuario.email, rol);
  const res = await request(app).post('/api/auth/login').send({ email: usuario.email, password: PASSWORD });
  return res.body.data.token;
}

const conToken = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url, body) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body),
  put: (url, body) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body),
  del: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
});

async function filasPedidos(idUsuario) {
  const { rows } = await pool.query(
    'SELECT id_pedido, estado, numero_pedido, fecha_pedido FROM pedidos WHERE id_usuario = $1 ORDER BY id_pedido',
    [idUsuario]
  );
  return rows;
}

beforeAll(async () => {
  // Las pruebas cambian precios, existencias o estados: se guardan para restaurarlos después de cada una.
  const { rows } = await pool.query('SELECT id_producto, nombre, precio, existencias, estado FROM productos');
  productosOriginales = rows;
  ids = Object.fromEntries(rows.map((p) => [p.nombre, p.id_producto]));
});

beforeEach(async () => {
  await limpiarUsuarios();
});

afterEach(async () => {
  for (const p of productosOriginales) {
    await pool.query('UPDATE productos SET precio = $2, existencias = $3, estado = $4 WHERE id_producto = $1', [
      p.id_producto,
      p.precio,
      p.existencias,
      p.estado
    ]);
  }
});

describe('El carrito es un pedido en estado carrito', () => {
  let api;
  let idUsuario;

  beforeEach(async () => {
    api = conToken(await tokenDe(CLIENTE));
    idUsuario = (await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1', [CLIENTE.email])).rows[0].id_usuario;
  });

  it('GET /carrito crea un pedido carrito sin número, sin fecha de pedido y sin envío', async () => {
    const res = await api.get('/api/carrito');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ items: [], total: 0, puede_comprar: false });
    expect(res.body.data.id_pedido).toEqual(expect.any(Number));
    expect(res.body.data).not.toHaveProperty('id_carrito');

    const { rows } = await pool.query('SELECT * FROM pedidos WHERE id_pedido = $1', [res.body.data.id_pedido]);
    expect(rows[0]).toMatchObject({ estado: 'carrito', numero_pedido: null, fecha_pedido: null, envio_nombre: null });
  });

  it('un cliente tiene un solo carrito (índice único parcial)', async () => {
    const primero = (await api.get('/api/carrito')).body.data.id_pedido;
    const segundo = (await api.get('/api/carrito')).body.data.id_pedido;

    expect(segundo).toBe(primero);
    await expect(pool.query("INSERT INTO pedidos (id_usuario, estado) VALUES ($1, 'carrito')", [idUsuario])).rejects.toMatchObject({
      code: '23505'
    });
  });

  it('agregar dos veces el mismo producto suma cantidades en una sola línea de detalle_pedido (R2)', async () => {
    await api.post('/api/carrito/items', { id_producto: ids['MTB Sierra 29'], cantidad: 1 });
    const res = await api.post('/api/carrito/items', { id_producto: ids['MTB Sierra 29'], cantidad: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).toMatchObject({ cantidad: 3, precio: 2890000 });

    const { rows } = await pool.query('SELECT cantidad, precio_unitario FROM detalle_pedido WHERE id_pedido = $1', [
      res.body.data.id_pedido
    ]);
    expect(rows).toEqual([{ cantidad: 3, precio_unitario: 2890000 }]);
  });

  it('modificar a 0 se rechaza con CANTIDAD_MINIMA y eliminar borra la línea, no el pedido', async () => {
    const { id_pedido } = (await api.post('/api/carrito/items', { id_producto: ids['Casco Ruta Aero'] })).body.data;

    expect((await api.put(`/api/carrito/items/${ids['Casco Ruta Aero']}`, { cantidad: 0 })).body.code).toBe('CANTIDAD_MINIMA');
    expect((await api.del(`/api/carrito/items/${ids['Casco Ruta Aero']}`)).status).toBe(200);

    const { rows } = await pool.query('SELECT estado FROM pedidos WHERE id_pedido = $1', [id_pedido]);
    expect(rows[0].estado).toBe('carrito');
  });

  it('un producto inactivo queda en el carrito marcado y bloquea la confirmación (D4, CU-06, CU-07)', async () => {
    await api.post('/api/carrito/items', { id_producto: ids['Casco MTB Trail'] });
    await pool.query("UPDATE productos SET estado = 'inactivo' WHERE id_producto = $1", [ids['Casco MTB Trail']]);

    const carrito = (await api.get('/api/carrito')).body.data;
    expect(carrito.items[0]).toMatchObject({ disponible: false, motivo: 'INACTIVO' });
    expect(carrito.puede_comprar).toBe(false);

    const res = await api.post('/api/pedidos', ENVIO);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CARRITO_NO_DISPONIBLE');
    expect((await filasPedidos(idUsuario))[0].estado).toBe('carrito'); // sigue siendo carrito
  });

  it('confirmar sin productos responde 400 CARRITO_VACIO', async () => {
    const res = await api.post('/api/pedidos', ENVIO);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CARRITO_VACIO');
  });
});

describe('Confirmar el carrito (CU-07, CU-08)', () => {
  let api;
  let idUsuario;

  beforeEach(async () => {
    api = conToken(await tokenDe(CLIENTE));
    idUsuario = (await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1', [CLIENTE.email])).rows[0].id_usuario;
    await api.post('/api/carrito/items', { id_producto: ids['Luces LED recargables'], cantidad: 2 });
  });

  it('pasa a pendiente con número, fecha de pedido y envío, y refresca el precio al vigente (R3, R4)', async () => {
    const idCarrito = (await api.get('/api/carrito')).body.data.id_pedido;
    await pool.query('UPDATE productos SET precio = 85000 WHERE id_producto = $1', [ids['Luces LED recargables']]);

    const res = await api.post('/api/pedidos', ENVIO);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id_pedido: idCarrito, estado: 'pendiente', total: 170000, ...ENVIO });
    expect(res.body.data.numero_pedido).toMatch(/^BS-\d{4}-\d{6}$/);
    expect(res.body.data.fecha_pedido).toEqual(expect.any(String));
    expect(res.body.data.items[0]).toMatchObject({ cantidad: 2, precio_unitario: 85000 });
  });

  it('después de confirmar el carrito queda vacío y el siguiente producto crea un carrito nuevo', async () => {
    const confirmado = (await api.post('/api/pedidos', ENVIO)).body.data;

    const vacio = (await api.get('/api/carrito')).body.data;
    expect(vacio.items).toEqual([]);
    expect(vacio.id_pedido).not.toBe(confirmado.id_pedido);

    const estados = (await filasPedidos(idUsuario)).map((p) => p.estado);
    expect(estados).toEqual(['pendiente', 'carrito']);
  });

  it('GET /pedidos lista solo los confirmados, nunca el carrito', async () => {
    const confirmado = (await api.post('/api/pedidos', ENVIO)).body.data;
    await api.post('/api/carrito/items', { id_producto: ids['Casco Ruta Aero'] }); // carrito nuevo con un producto

    const res = await api.get('/api/pedidos');

    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.numero_pedido)).toEqual([confirmado.numero_pedido]);
  });
});

describe('Pagar (CU-08)', () => {
  let api;
  let pedido;

  beforeEach(async () => {
    api = conToken(await tokenDe(CLIENTE));
    await api.post('/api/carrito/items', { id_producto: ids['Candado en U reforzado'], cantidad: 2 });
    pedido = (await api.post('/api/pedidos', ENVIO)).body.data;
  });

  it('no se puede pagar un carrito: responde 404', async () => {
    const carrito = (await api.post('/api/carrito/items', { id_producto: ids['Casco Ruta Aero'] })).body.data;

    const res = await api.post(`/api/pedidos/${carrito.id_pedido}/pagos`, TARJETA_OK);

    expect(res.status).toBe(404);
  });

  it('el pago aprobado descuenta stock y no toca el carrito nuevo del cliente', async () => {
    await api.post('/api/carrito/items', { id_producto: ids['Casco Ruta Aero'] });

    const res = await api.post(`/api/pedidos/${pedido.id_pedido}/pagos`, TARJETA_OK);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ estado: 'pagado', numero_pedido: pedido.numero_pedido });
    const { rows } = await pool.query('SELECT existencias FROM productos WHERE id_producto = $1', [ids['Candado en U reforzado']]);
    expect(rows[0].existencias).toBe(28);
    expect((await api.get('/api/carrito')).body.data.items).toHaveLength(1);
  });

  it('un pago rechazado deja el pedido fallido con el mismo número y se puede reintentar (decisiones D y F)', async () => {
    const rechazo = await api.post(`/api/pedidos/${pedido.id_pedido}/pagos`, TARJETA_RECHAZO);
    expect(rechazo.status).toBe(402);
    expect(rechazo.body.data).toMatchObject({ estado: 'fallido', numero_pedido: pedido.numero_pedido });

    const reintento = await api.post(`/api/pedidos/${pedido.id_pedido}/pagos`, TARJETA_OK);
    expect(reintento.status).toBe(201);
    expect(reintento.body.data.numero_pedido).toBe(pedido.numero_pedido);
  });
});

describe('Tablero (CU-16, CU-17)', () => {
  let cliente;
  let admin;

  beforeEach(async () => {
    cliente = conToken(await tokenDe(CLIENTE));
    admin = conToken(await tokenDe(ADMIN, 'admin'));
  });

  it('las métricas cuentan solo pedidos pagados y filtran por fecha_pedido, no por created_at', async () => {
    await cliente.post('/api/carrito/items', { id_producto: ids['Luces LED recargables'], cantidad: 1 });
    const pedido = (await cliente.post('/api/pedidos', ENVIO)).body.data;
    await cliente.post(`/api/pedidos/${pedido.id_pedido}/pagos`, TARJETA_OK);
    // Se creó hoy (created_at) pero se confirmó el 15 de marzo (fecha_pedido).
    await pool.query("UPDATE pedidos SET fecha_pedido = '2026-03-15 10:00-05' WHERE id_pedido = $1", [pedido.id_pedido]);

    const marzo = await admin.get('/api/dashboard/metricas?desde=2026-03-15&hasta=2026-03-15');
    const hoy = await admin.get(`/api/dashboard/metricas?desde=${new Date().toISOString().slice(0, 10)}`);

    expect(marzo.body.data).toMatchObject({ cantidad_pedidos: 1, ventas_totales: 79000, unidades_vendidas: 1 });
    expect(hoy.body.data.cantidad_pedidos).toBe(0);
  });

  it('los carritos no cuentan como pedidos: ni en métricas ni en pendientes', async () => {
    await cliente.post('/api/carrito/items', { id_producto: ids['Luces LED recargables'], cantidad: 1 });

    const metricas = await admin.get('/api/dashboard/metricas');
    const alertas = await admin.get('/api/dashboard/alertas');

    expect(metricas.body.data.cantidad_pedidos).toBe(0);
    expect(alertas.body.data.pedidos_pendientes).toEqual([]);
  });

  it('las alertas usan fecha_pedido y listan los productos inactivos que siguen en carritos', async () => {
    await cliente.post('/api/carrito/items', { id_producto: ids['MTB Páramo 27.5'] });
    const pedido = (await cliente.post('/api/pedidos', ENVIO)).body.data; // queda pendiente
    await cliente.post('/api/carrito/items', { id_producto: ids['Casco MTB Trail'] }); // carrito nuevo
    await pool.query("UPDATE productos SET estado = 'inactivo' WHERE id_producto = $1", [ids['Casco MTB Trail']]);

    const { data } = (await admin.get('/api/dashboard/alertas')).body;

    expect(data.pedidos_pendientes).toEqual([
      { id_pedido: pedido.id_pedido, numero_pedido: pedido.numero_pedido, fecha_pedido: expect.any(String) }
    ]);
    expect(data.inactivos_en_carritos).toContainEqual({ id_producto: ids['Casco MTB Trail'], nombre: 'Casco MTB Trail', carritos: 1 });
  });
});

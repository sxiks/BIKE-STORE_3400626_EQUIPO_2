// Pruebas de la gestión de categorías del administrador (B2.2, decisión M).
// Contrato: docs/diseno-tecnico/API_CONTRATOS.md, sección "Catálogo y productos".
// Las categorías y productos de la semilla vuelven a su estado después de cada prueba.
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const app = require('../src/app.js');
const db = require('./helpers/db.js');
const { registrarYEntrar, conToken } = require('./helpers/sesion.js');

const ADMIN = { nombre: 'Admin Tienda', email: 'admin@prueba.local' };
const CLIENTE = { nombre: 'Ana Cliente', email: 'ana@prueba.local' };

let fotoProductos;
let fotoCategorias;
let admin;   // atajos de Supertest con el token del admin
let cliente;

// Categoría de la semilla por nombre, y cuántos productos tiene (activos e inactivos).
const deSemilla = (nombre) => fotoCategorias.find((c) => c.nombre === nombre);
const totalEnSemilla = (idCategoria) => fotoProductos.filter((p) => p.id_categoria === idCategoria).length;

beforeAll(async () => {
  fotoProductos = await db.fotoProductos();
  fotoCategorias = await db.fotoCategorias();
});

beforeEach(async () => {
  await db.limpiarUsuarios();
  admin = conToken(await registrarYEntrar(ADMIN, 'admin'));
  cliente = conToken(await registrarYEntrar(CLIENTE));
});

afterEach(async () => {
  await db.limpiarUsuarios();
  await db.restaurarProductos(fotoProductos);
  await db.restaurarCategorias(fotoCategorias);
});

describe('Acceso', () => {
  it('sin token responde 401 y con un cliente 403 en todas las rutas de gestión', async () => {
    const id = fotoCategorias[0].id_categoria;
    expect((await request(app).get('/api/categorias/admin')).status).toBe(401);
    expect((await request(app).post('/api/categorias').send({ nombre: 'X' })).status).toBe(401);

    expect((await cliente.get('/api/categorias/admin')).status).toBe(403);
    expect((await cliente.post('/api/categorias', { nombre: 'Repuestos' })).status).toBe(403);
    expect((await cliente.put(`/api/categorias/${id}`, { nombre: 'Otra' })).status).toBe(403);
    expect((await cliente.del(`/api/categorias/${id}`)).status).toBe(403);
    expect(await db.fotoCategorias()).toHaveLength(fotoCategorias.length);
  });

  it('GET /categorias sigue siendo público y sin el conteo', async () => {
    const res = await request(app).get('/api/categorias');

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['id_categoria', 'nombre']);
  });
});

describe('GET /categorias/admin', () => {
  it('lista todas con su total de productos, contando los inactivos, ordenadas por nombre', async () => {
    const res = await admin.get('/api/categorias/admin');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(fotoCategorias.length);
    const nombres = res.body.data.map((c) => c.nombre);
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b)));
    for (const c of res.body.data) expect(c.total_productos).toBe(totalEnSemilla(c.id_categoria));

    // Accesorios incluye la "Bomba de piso", inactiva en la semilla.
    const accesorios = deSemilla('Accesorios');
    expect(fotoProductos.some((p) => p.id_categoria === accesorios.id_categoria && p.estado === 'inactivo')).toBe(true);
  });
});

describe('POST /categorias', () => {
  it('crea la categoría (sin espacios sobrantes) y aparece en la lista pública', async () => {
    const res = await admin.post('/api/categorias', { nombre: '  Repuestos  ' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ nombre: 'Repuestos', total_productos: 0 });
    const publica = await request(app).get('/api/categorias');
    expect(publica.body.data.map((c) => c.nombre)).toContain('Repuestos');
  });

  it('un nombre repetido, sin distinguir mayúsculas, responde 409 CATEGORIA_DUPLICADA', async () => {
    const res = await admin.post('/api/categorias', { nombre: 'accesorios' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CATEGORIA_DUPLICADA');
  });

  it('sin nombre o con más de 100 caracteres responde 400', async () => {
    expect((await admin.post('/api/categorias', {})).status).toBe(400);
    expect((await admin.post('/api/categorias', { nombre: '   ' })).status).toBe(400);
    expect((await admin.post('/api/categorias', { nombre: 'a'.repeat(101) })).status).toBe(400);
    expect(await db.fotoCategorias()).toHaveLength(fotoCategorias.length);
  });
});

describe('PUT /categorias/:id', () => {
  it('renombra y los productos de la categoría muestran el nombre nuevo', async () => {
    const cascos = deSemilla('Cascos y protección');

    const res = await admin.put(`/api/categorias/${cascos.id_categoria}`, { nombre: 'Cascos' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id_categoria: cascos.id_categoria, nombre: 'Cascos', total_productos: totalEnSemilla(cascos.id_categoria) });
    const productos = await request(app).get(`/api/productos?categoria=${cascos.id_categoria}`);
    expect(productos.body.data.every((p) => p.categoria === 'Cascos')).toBe(true);
  });

  it('cambiar solo mayúsculas del propio nombre se permite', async () => {
    const accesorios = deSemilla('Accesorios');

    const res = await admin.put(`/api/categorias/${accesorios.id_categoria}`, { nombre: 'ACCESORIOS' });

    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toBe('ACCESORIOS');
  });

  it('el nombre de otra categoría responde 409, un id inexistente 404 y un nombre vacío 400', async () => {
    const accesorios = deSemilla('Accesorios');

    const duplicada = await admin.put(`/api/categorias/${accesorios.id_categoria}`, { nombre: 'Bicicletas de ruta' });
    expect(duplicada.status).toBe(409);
    expect(duplicada.body.code).toBe('CATEGORIA_DUPLICADA');
    expect((await admin.put('/api/categorias/999999', { nombre: 'Nueva' })).status).toBe(404);
    expect((await admin.put(`/api/categorias/${accesorios.id_categoria}`, { nombre: '' })).status).toBe(400);
  });
});

describe('DELETE /categorias/:id · decisión M', () => {
  it('elimina una categoría sin productos', async () => {
    const creada = (await admin.post('/api/categorias', { nombre: 'Temporal' })).body.data;

    const res = await admin.del(`/api/categorias/${creada.id_categoria}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id_categoria: creada.id_categoria });
    expect((await db.fotoCategorias()).some((c) => c.id_categoria === creada.id_categoria)).toBe(false);
  });

  it('con productos responde 409 CATEGORIA_CON_PRODUCTOS con el total, y no borra nada', async () => {
    const montana = deSemilla('Bicicletas de montaña');

    const res = await admin.del(`/api/categorias/${montana.id_categoria}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CATEGORIA_CON_PRODUCTOS');
    expect(res.body.data.total_productos).toBe(totalEnSemilla(montana.id_categoria));
    expect(await db.fotoCategorias()).toHaveLength(fotoCategorias.length);
  });

  it('también responde 409 si todos sus productos están inactivos', async () => {
    const urbanas = deSemilla('Bicicletas urbanas');
    await db.pool.query("UPDATE productos SET estado = 'inactivo' WHERE id_categoria = $1", [urbanas.id_categoria]);

    const res = await admin.del(`/api/categorias/${urbanas.id_categoria}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CATEGORIA_CON_PRODUCTOS');
  });

  it('un id inexistente responde 404 y uno inválido 400', async () => {
    expect((await admin.del('/api/categorias/999999')).status).toBe(404);
    expect((await admin.del('/api/categorias/abc')).status).toBe(400);
  });
});

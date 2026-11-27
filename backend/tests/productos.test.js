// Pruebas del catálogo público y de la administración de productos: CU-01, CU-02, CU-12 a CU-15.
// Contratos: docs/diseno-tecnico/API_CONTRATOS.md, sección "Catálogo y productos".
// Las imágenes que suben las pruebas se borran después de cada una, y se comprueba que
// backend/uploads/productos quede igual que antes (sin archivos huérfanos).
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const app = require('../src/app.js');
const { limpiarUsuarios, fotoProductos, restaurarProductos, productoPorId } = require('./helpers/db.js');
const { registrarYEntrar } = require('./helpers/sesion.js');
const img = require('./helpers/imagenes.js');

const ADMIN = { nombre: 'Admin Tienda', email: 'admin@prueba.local' };
const CLIENTE = { nombre: 'Ana Cliente', email: 'ana@prueba.local' };

let foto;          // productos de la semilla, para restaurarlos
let archivosAntes; // contenido de uploads/productos antes de cada prueba
let tokenAdmin;
let tokenCliente;
let categorias;    // { 'Accesorios': id, ... }

const nombres = (res) => res.body.data.map((p) => p.nombre);
const conAdmin = (peticion) => peticion.set('Authorization', `Bearer ${tokenAdmin}`);

// Envía un producto por multipart/form-data. `archivo`: { buffer, filename, contentType } o null.
function enviarProducto(metodo, url, campos, archivo = { buffer: img.PNG, filename: 'foto.png', contentType: 'image/png' }) {
  let peticion = conAdmin(request(app)[metodo](url));
  for (const [campo, valor] of Object.entries(campos)) peticion = peticion.field(campo, String(valor));
  if (archivo) peticion = peticion.attach('imagen', archivo.buffer, { filename: archivo.filename, contentType: archivo.contentType });
  return peticion;
}

const productoNuevo = (extra = {}) => ({
  id_categoria: categorias['Accesorios'],
  nombre: 'Timbre clásico',
  descripcion: 'Timbre de aluminio',
  precio: 25000,
  existencias: 10,
  ...extra
});

const crear = (extra, archivo) => enviarProducto('post', '/api/productos', productoNuevo(extra), archivo);

beforeAll(async () => {
  foto = await fotoProductos();
  const res = await request(app).get('/api/categorias');
  categorias = Object.fromEntries(res.body.data.map((c) => [c.nombre, c.id_categoria]));
});

beforeEach(async () => {
  await limpiarUsuarios();
  await restaurarProductos(foto);
  archivosAntes = img.archivosEnUploads();
  tokenAdmin = await registrarYEntrar(ADMIN, 'admin');
  tokenCliente = await registrarYEntrar(CLIENTE);
});

afterEach(async () => {
  const sobrantes = img.archivosEnUploads().filter((n) => !archivosAntes.includes(n));
  img.borrarNuevos(archivosAntes);
  await limpiarUsuarios();
  await restaurarProductos(foto);
  // Lo que una prueba sube debe terminar en un producto de la base o borrarse: aquí solo
  // pueden sobrar las imágenes de los productos que la prueba creó con éxito.
  expect(sobrantes.every((n) => /^\d+-\d+\.(png|jpg|webp)$/.test(n))).toBe(true);
});

describe('Catálogo público · CU-01, CU-02', () => {
  it('GET /productos solo devuelve activos; los agotados vienen con disponible = false', async () => {
    const res = await request(app).get('/api/productos');

    expect(res.status).toBe(200);
    expect(nombres(res)).not.toContain('Bomba de piso'); // inactiva en la semilla
    expect(res.body.data).toHaveLength(9);
    const plegable = res.body.data.find((p) => p.nombre === 'Urbana Plegable 20');
    expect(plegable).toMatchObject({ existencias: 0, disponible: false });
    expect(res.body.data.find((p) => p.nombre === 'MTB Sierra 29').disponible).toBe(true);
  });

  it('filtra por categoría', async () => {
    const res = await request(app).get(`/api/productos?categoria=${categorias['Cascos y protección']}`);

    expect(res.status).toBe(200);
    expect(nombres(res).sort()).toEqual(['Casco MTB Trail', 'Casco Ruta Aero']);
  });

  it('ordena por precio ascendente y descendente', async () => {
    const asc = (await request(app).get('/api/productos?orden=precio_asc')).body.data.map((p) => p.precio);
    const desc = (await request(app).get('/api/productos?orden=precio_desc')).body.data.map((p) => p.precio);

    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...asc].reverse());
  });

  it('un orden o una categoría inválidos responden 400', async () => {
    expect((await request(app).get('/api/productos?orden=nombre_desc')).status).toBe(400);
    expect((await request(app).get('/api/productos?categoria=abc')).status).toBe(400);
  });

  it('GET /productos/:id devuelve un activo; un inactivo o inexistente es 404 y un id inválido 400', async () => {
    const sierra = foto.find((p) => p.nombre === 'MTB Sierra 29');
    const bomba = foto.find((p) => p.nombre === 'Bomba de piso');

    const ok = await request(app).get(`/api/productos/${sierra.id_producto}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ nombre: 'MTB Sierra 29', categoria: 'Bicicletas de montaña' });

    expect((await request(app).get(`/api/productos/${bomba.id_producto}`)).status).toBe(404);
    expect((await request(app).get('/api/productos/999999')).status).toBe(404);
    expect((await request(app).get('/api/productos/abc')).status).toBe(400);
  });

  it('GET /categorias es público y lista las 5 categorías', async () => {
    const res = await request(app).get('/api/categorias');

    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.nombre).sort()).toEqual([
      'Accesorios',
      'Bicicletas de montaña',
      'Bicicletas de ruta',
      'Bicicletas urbanas',
      'Cascos y protección'
    ]);
  });
});

describe('GET /productos/admin · CU-15', () => {
  it('incluye los inactivos y filtra por q, categoría y estado', async () => {
    const todos = await conAdmin(request(app).get('/api/productos/admin'));
    expect(todos.status).toBe(200);
    expect(todos.body.data).toHaveLength(10);
    expect(nombres(todos)).toContain('Bomba de piso');

    const q = await conAdmin(request(app).get('/api/productos/admin?q=casco'));
    expect(nombres(q).sort()).toEqual(['Casco MTB Trail', 'Casco Ruta Aero']);

    const inactivos = await conAdmin(request(app).get('/api/productos/admin?estado=inactivo'));
    expect(nombres(inactivos)).toEqual(['Bomba de piso']);

    const accesoriosActivos = await conAdmin(
      request(app).get(`/api/productos/admin?categoria=${categorias['Accesorios']}&estado=activo`)
    );
    expect(nombres(accesoriosActivos).sort()).toEqual(['Candado en U reforzado', 'Luces LED recargables']);
  });

  it('q busca % y _ como texto, no como comodines', async () => {
    await crear({ nombre: 'Kit 100% reflectivo' });
    await crear({ nombre: 'Kit 1000 reflectivo' });

    const res = await conAdmin(request(app).get(`/api/productos/admin?q=${encodeURIComponent('100%')}`));

    expect(nombres(res)).toEqual(['Kit 100% reflectivo']);
  });

  it('estado inválido responde 400', async () => {
    expect((await conAdmin(request(app).get('/api/productos/admin?estado=borrado'))).status).toBe(400);
  });

  it('sin token responde 401 y con un cliente 403', async () => {
    expect((await request(app).get('/api/productos/admin')).status).toBe(401);
    const res = await request(app).get('/api/productos/admin').set('Authorization', `Bearer ${tokenCliente}`);
    expect(res.status).toBe(403);
  });

  it('GET /productos/admin/:id también devuelve un inactivo', async () => {
    const bomba = foto.find((p) => p.nombre === 'Bomba de piso');

    const res = await conAdmin(request(app).get(`/api/productos/admin/${bomba.id_producto}`));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ nombre: 'Bomba de piso', estado: 'inactivo' });
  });
});

describe('POST /productos · CU-12', () => {
  it('crea el producto con su imagen guardada en disco', async () => {
    const res = await crear();

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ nombre: 'Timbre clásico', precio: 25000, existencias: 10, estado: 'activo' });
    expect(res.body.data.imagen).toMatch(/\.png$/);
    expect(img.existeEnUploads(res.body.data.imagen)).toBe(true);
  });

  it('acepta jpg y webp', async () => {
    const jpg = await crear({ nombre: 'Guantes' }, { buffer: img.JPEG, filename: 'g.jpg', contentType: 'image/jpeg' });
    const webp = await crear({ nombre: 'Gorra' }, { buffer: img.WEBP, filename: 'g.webp', contentType: 'image/webp' });

    expect(jpg.status).toBe(201);
    expect(jpg.body.data.imagen).toMatch(/\.jpg$/);
    expect(webp.status).toBe(201);
    expect(webp.body.data.imagen).toMatch(/\.webp$/);
  });

  it('un cliente recibe 403 y no se guarda ningún archivo', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .field('nombre', 'Intento')
      .attach('imagen', img.PNG, { filename: 'x.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
    expect(img.archivosEnUploads()).toEqual(archivosAntes);
  });

  it('sin imagen responde 400', async () => {
    const res = await crear({}, null);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/imagen/i);
  });

  it.each([
    ['precio 0', { precio: 0 }],
    ['precio negativo', { precio: -100 }],
    ['existencias negativas', { existencias: -1 }],
    ['existencias decimales', { existencias: 1.5 }],
    ['sin nombre', { nombre: '' }],
    ['categoría inexistente', { id_categoria: 9999 }]
  ])('%s responde 400 y borra la imagen subida', async (_caso, extra) => {
    const res = await crear(extra);

    expect(res.status).toBe(400);
    expect(img.archivosEnUploads()).toEqual(archivosAntes);
  });

  it('nombre duplicado en la misma categoría, sin distinguir mayúsculas, responde 409 PRODUCTO_DUPLICADO', async () => {
    const res = await crear({ nombre: 'LUCES led RECARGABLES' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRODUCTO_DUPLICADO');
    expect(img.archivosEnUploads()).toEqual(archivosAntes);
  });

  it('el mismo nombre en otra categoría sí se permite', async () => {
    const res = await crear({ nombre: 'Luces LED recargables', id_categoria: categorias['Cascos y protección'] });

    expect(res.status).toBe(201);
  });
});

describe('Validación de la imagen', () => {
  it('un formato no permitido responde 400 y no guarda nada', async () => {
    const res = await crear({}, { buffer: img.TEXTO, filename: 'notas.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/formato de imagen no permitido/i);
    expect(img.archivosEnUploads()).toEqual(archivosAntes);
  });

  it('una imagen de más de 2 MB responde 400 (no 500) y no guarda nada', async () => {
    const res = await crear({}, { buffer: img.PNG_GRANDE, filename: 'grande.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/2 MB/);
    expect(img.archivosEnUploads()).toEqual(archivosAntes);
  });

  it('un archivo que no es imagen, aunque diga image/png, responde 400 y no guarda nada', async () => {
    const texto = await crear({}, { buffer: img.TEXTO, filename: 'falsa.png', contentType: 'image/png' });
    const html = await crear({ nombre: 'Otro' }, { buffer: img.HTML, filename: 'pagina.html', contentType: 'image/png' });

    expect(texto.status).toBe(400);
    expect(html.status).toBe(400);
    expect(img.archivosEnUploads()).toEqual(archivosAntes);
  });

  it('la extensión guardada sale del tipo de imagen, nunca del nombre original', async () => {
    const res = await crear({}, { buffer: img.PNG, filename: 'foto.html', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.imagen).toMatch(/^\d+-\d+\.png$/);
  });

  it('un PNG enviado como image/jpeg se rechaza (el contenido no coincide con el tipo)', async () => {
    const res = await crear({}, { buffer: img.PNG, filename: 'foto.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(img.archivosEnUploads()).toEqual(archivosAntes);
  });
});

describe('PUT /productos/:id · CU-13', () => {
  let creado;

  beforeEach(async () => {
    creado = (await crear()).body.data;
  });

  it('actualización parcial: lo que no se envía se conserva', async () => {
    const res = await enviarProducto('put', `/api/productos/${creado.id_producto}`, { precio: 30000 }, null);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      nombre: 'Timbre clásico',
      descripcion: 'Timbre de aluminio',
      precio: 30000,
      existencias: 10,
      imagen: creado.imagen
    });
  });

  it('al reemplazar la imagen, la anterior se borra del disco', async () => {
    const res = await enviarProducto('put', `/api/productos/${creado.id_producto}`, {});

    expect(res.status).toBe(200);
    expect(res.body.data.imagen).not.toBe(creado.imagen);
    expect(img.existeEnUploads(res.body.data.imagen)).toBe(true);
    expect(img.existeEnUploads(creado.imagen)).toBe(false);
    expect((await productoPorId(creado.id_producto)).imagen).toBe(res.body.data.imagen);
  });

  it('un dato inválido responde 400, no cambia nada y borra la imagen nueva', async () => {
    const res = await enviarProducto('put', `/api/productos/${creado.id_producto}`, { precio: -5 });

    expect(res.status).toBe(400);
    expect(img.archivosEnUploads().filter((n) => !archivosAntes.includes(n))).toEqual([creado.imagen]);
    expect((await productoPorId(creado.id_producto)).precio).toBe(25000);
  });

  it('renombrarlo como otro de la misma categoría responde 409 PRODUCTO_DUPLICADO', async () => {
    const res = await enviarProducto('put', `/api/productos/${creado.id_producto}`, { nombre: 'Candado en U reforzado' }, null);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRODUCTO_DUPLICADO');
  });

  it('un producto inexistente responde 404 y no deja la imagen subida', async () => {
    const res = await enviarProducto('put', '/api/productos/999999', { precio: 1000 });

    expect(res.status).toBe(404);
    expect(img.archivosEnUploads().filter((n) => !archivosAntes.includes(n))).toEqual([creado.imagen]);
  });
});

describe('PATCH /productos/:id/estado · CU-14', () => {
  it('inactivar lo saca del catálogo público y reactivar lo devuelve', async () => {
    const sierra = foto.find((p) => p.nombre === 'MTB Sierra 29');
    const url = `/api/productos/${sierra.id_producto}/estado`;

    const inactivo = await conAdmin(request(app).patch(url)).send({ estado: 'inactivo' });
    expect(inactivo.status).toBe(200);
    expect(inactivo.body.data.estado).toBe('inactivo');
    expect(nombres(await request(app).get('/api/productos'))).not.toContain('MTB Sierra 29');
    expect((await request(app).get(`/api/productos/${sierra.id_producto}`)).status).toBe(404);

    const activo = await conAdmin(request(app).patch(url)).send({ estado: 'activo' });
    expect(activo.status).toBe(200);
    expect(nombres(await request(app).get('/api/productos'))).toContain('MTB Sierra 29');
  });

  it('es borrado lógico: el producto sigue en la base', async () => {
    const sierra = foto.find((p) => p.nombre === 'MTB Sierra 29');

    await conAdmin(request(app).patch(`/api/productos/${sierra.id_producto}/estado`)).send({ estado: 'inactivo' });

    expect(await productoPorId(sierra.id_producto)).toMatchObject({ nombre: 'MTB Sierra 29', estado: 'inactivo' });
  });

  it('estado inválido responde 400 e inexistente 404', async () => {
    const sierra = foto.find((p) => p.nombre === 'MTB Sierra 29');

    expect((await conAdmin(request(app).patch(`/api/productos/${sierra.id_producto}/estado`)).send({ estado: 'borrado' })).status).toBe(400);
    expect((await conAdmin(request(app).patch('/api/productos/999999/estado')).send({ estado: 'activo' })).status).toBe(404);
  });

  it('un cliente recibe 403', async () => {
    const sierra = foto.find((p) => p.nombre === 'MTB Sierra 29');
    const res = await request(app)
      .patch(`/api/productos/${sierra.id_producto}/estado`)
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ estado: 'inactivo' });

    expect(res.status).toBe(403);
  });
});

// Pruebas del catálogo público y de la administración de productos: CU-01, CU-02, CU-12 a CU-15,
// y de la eliminación de productos nunca usados y la galería de imágenes (B2.2, decisión M).
// Contratos: docs/diseno-tecnico/API_CONTRATOS.md, sección "Catálogo y productos".
// Las imágenes que suben las pruebas se borran después de cada una, y se comprueba que
// backend/uploads/productos quede igual que antes (sin archivos huérfanos).
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const app = require('../src/app.js');
const { limpiarUsuarios, fotoProductos, restaurarProductos, productoPorId, limpiarGaleria, galeriaDe } = require('./helpers/db.js');
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
  await limpiarGaleria();
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

// ---------- B2.2 · decisión M ----------

// Sube una imagen a la galería del producto.
function subirImagen(id, archivo = { buffer: img.PNG, filename: 'extra.png', contentType: 'image/png' }) {
  return conAdmin(request(app).post(`/api/productos/${id}/imagenes`)).attach('imagen', archivo.buffer, {
    filename: archivo.filename,
    contentType: archivo.contentType
  });
}

const alCarrito = (idProducto) =>
  request(app).post('/api/carrito/items').set('Authorization', `Bearer ${tokenCliente}`).send({ id_producto: idProducto });

describe('DELETE /productos/:id · decisión M', () => {
  it('elimina un producto que nunca se usó y borra del disco la portada y la galería', async () => {
    const creado = (await crear()).body.data;
    const extra = (await subirImagen(creado.id_producto)).body.data.imagenes[0];

    const res = await conAdmin(request(app).delete(`/api/productos/${creado.id_producto}`));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id_producto: creado.id_producto });
    expect(await productoPorId(creado.id_producto)).toBeNull();
    expect(await galeriaDe(creado.id_producto)).toEqual([]);
    expect(img.existeEnUploads(creado.imagen)).toBe(false);
    expect(img.existeEnUploads(extra.imagen)).toBe(false);
    expect(img.archivosEnUploads()).toEqual(archivosAntes);
  });

  it('si está en un carrito responde 409 PRODUCTO_CON_PEDIDOS y no borra nada', async () => {
    const creado = (await crear()).body.data;
    expect((await alCarrito(creado.id_producto)).status).toBe(200);

    const res = await conAdmin(request(app).delete(`/api/productos/${creado.id_producto}`));

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRODUCTO_CON_PEDIDOS');
    expect(res.body.message).toMatch(/inactívalo/i);
    expect(await productoPorId(creado.id_producto)).not.toBeNull();
    expect(img.existeEnUploads(creado.imagen)).toBe(true);
  });

  it('si el cliente lo quita de su carrito, ya no está en ninguna línea y se puede eliminar', async () => {
    // Quitarlo del carrito borra la línea: entonces ya no está en ningún carrito ni pedido y se puede eliminar.
    const creado = (await crear()).body.data;
    await alCarrito(creado.id_producto);
    await request(app).delete(`/api/carrito/items/${creado.id_producto}`).set('Authorization', `Bearer ${tokenCliente}`);

    const res = await conAdmin(request(app).delete(`/api/productos/${creado.id_producto}`));

    expect(res.status).toBe(200);
  });

  it('un producto de un pedido ya confirmado responde 409', async () => {
    const sierra = foto.find((p) => p.nombre === 'MTB Sierra 29');
    await alCarrito(sierra.id_producto);
    const pedido = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        envio_nombre: 'Ana Cliente',
        envio_telefono: '3001234567',
        envio_departamento: 'Valle del Cauca',
        envio_ciudad: 'Palmira',
        envio_direccion: 'Calle 1 # 2-3'
      });
    expect(pedido.status).toBe(201);

    const res = await conAdmin(request(app).delete(`/api/productos/${sierra.id_producto}`));

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRODUCTO_CON_PEDIDOS');
  });

  it('inexistente responde 404, id inválido 400 y un cliente 403', async () => {
    expect((await conAdmin(request(app).delete('/api/productos/999999'))).status).toBe(404);
    expect((await conAdmin(request(app).delete('/api/productos/abc'))).status).toBe(400);
    const sierra = foto.find((p) => p.nombre === 'MTB Sierra 29');
    const res = await request(app).delete(`/api/productos/${sierra.id_producto}`).set('Authorization', `Bearer ${tokenCliente}`);
    expect(res.status).toBe(403);
    expect(await productoPorId(sierra.id_producto)).not.toBeNull();
  });
});

describe('Galería de imágenes · decisión M', () => {
  let creado;

  beforeEach(async () => {
    creado = (await crear()).body.data;
  });

  const galeria = async () => (await galeriaDe(creado.id_producto)).map((i) => i.id_imagen);

  it('agrega imágenes al final, en orden, y el detalle (admin y público) las incluye', async () => {
    const primera = await subirImagen(creado.id_producto);
    const segunda = await subirImagen(creado.id_producto, { buffer: img.WEBP, filename: 'b.webp', contentType: 'image/webp' });

    expect(primera.status).toBe(201);
    expect(segunda.body.data.imagenes).toHaveLength(2);
    expect(segunda.body.data.imagenes.map((i) => i.orden)).toEqual([1, 2]);
    expect(segunda.body.data.imagenes[1].imagen).toMatch(/\.webp$/);
    for (const i of segunda.body.data.imagenes) expect(img.existeEnUploads(i.imagen)).toBe(true);
    expect(segunda.body.data.imagen).toBe(creado.imagen); // la portada no cambia

    const publico = await request(app).get(`/api/productos/${creado.id_producto}`);
    expect(publico.body.data.imagenes).toEqual(segunda.body.data.imagenes);
    const listado = await request(app).get('/api/productos');
    expect(listado.body.data[0]).not.toHaveProperty('imagenes'); // los listados siguen livianos
  });

  it('permite 5 imágenes en total (portada + 4); la sexta responde 409 LIMITE_IMAGENES y se borra', async () => {
    for (let i = 0; i < 4; i++) expect((await subirImagen(creado.id_producto)).status).toBe(201);
    const enDisco = img.archivosEnUploads();

    const res = await subirImagen(creado.id_producto);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('LIMITE_IMAGENES');
    expect(res.body.data).toEqual({ maximo: 5 });
    expect(await galeria()).toHaveLength(4);
    expect(img.archivosEnUploads()).toEqual(enDisco);
  });

  it('un archivo que no es imagen responde 400 y no deja nada; sin archivo también 400', async () => {
    const res = await subirImagen(creado.id_producto, { buffer: img.HTML, filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect((await conAdmin(request(app).post(`/api/productos/${creado.id_producto}/imagenes`))).status).toBe(400);
    expect(await galeria()).toEqual([]);
    expect(img.archivosEnUploads().filter((n) => !archivosAntes.includes(n))).toEqual([creado.imagen]);
  });

  it('a un producto inexistente responde 404 y la imagen subida se borra', async () => {
    const enDisco = img.archivosEnUploads();
    expect((await subirImagen(999999)).status).toBe(404);
    expect(img.archivosEnUploads()).toEqual(enDisco);
  });

  it('quitar una imagen la saca de la galería y borra su archivo', async () => {
    const imagenes = (await subirImagen(creado.id_producto)).body.data.imagenes;
    const quitar = imagenes[0];

    const res = await conAdmin(request(app).delete(`/api/productos/${creado.id_producto}/imagenes/${quitar.id_imagen}`));

    expect(res.status).toBe(200);
    expect(res.body.data.imagenes).toEqual([]);
    expect(img.existeEnUploads(quitar.imagen)).toBe(false);
    expect(img.existeEnUploads(creado.imagen)).toBe(true);
  });

  it('una imagen de otro producto o inexistente responde 404', async () => {
    const otro = (await crear({ nombre: 'Otro timbre' })).body.data;
    const ajena = (await subirImagen(otro.id_producto)).body.data.imagenes[0];

    expect((await conAdmin(request(app).delete(`/api/productos/${creado.id_producto}/imagenes/${ajena.id_imagen}`))).status).toBe(404);
    expect((await conAdmin(request(app).patch(`/api/productos/${creado.id_producto}/imagenes/${ajena.id_imagen}/portada`))).status).toBe(404);
    expect((await conAdmin(request(app).delete(`/api/productos/${creado.id_producto}/imagenes/999999`))).status).toBe(404);
    expect(await galeriaDe(otro.id_producto)).toHaveLength(1);
  });

  it('elegir portada intercambia: la elegida pasa a portada y la anterior ocupa su lugar', async () => {
    await subirImagen(creado.id_producto);
    const imagenes = (await subirImagen(creado.id_producto)).body.data.imagenes;
    const elegida = imagenes[1];

    const res = await conAdmin(request(app).patch(`/api/productos/${creado.id_producto}/imagenes/${elegida.id_imagen}/portada`));

    expect(res.status).toBe(200);
    expect(res.body.data.imagen).toBe(elegida.imagen);
    expect(res.body.data.imagenes).toEqual([imagenes[0], { ...elegida, imagen: creado.imagen }]);
    expect((await productoPorId(creado.id_producto)).imagen).toBe(elegida.imagen);
    for (const nombre of [creado.imagen, elegida.imagen, imagenes[0].imagen]) expect(img.existeEnUploads(nombre)).toBe(true);
  });

  it('reordenar cambia el orden de la galería', async () => {
    for (let i = 0; i < 3; i++) await subirImagen(creado.id_producto);
    const [a, b, c] = await galeria();

    const res = await conAdmin(request(app).patch(`/api/productos/${creado.id_producto}/imagenes/orden`)).send({ ids: [c, a, b] });

    expect(res.status).toBe(200);
    expect(res.body.data.imagenes.map((i) => i.id_imagen)).toEqual([c, a, b]);
    expect(res.body.data.imagenes.map((i) => i.orden)).toEqual([1, 2, 3]);
    expect(await galeria()).toEqual([c, a, b]);
  });

  it('reordenar con ids que faltan, sobran, se repiten o no son de la galería responde 400 y no cambia nada', async () => {
    for (let i = 0; i < 2; i++) await subirImagen(creado.id_producto);
    const [a, b] = await galeria();
    const url = `/api/productos/${creado.id_producto}/imagenes/orden`;

    for (const ids of [[a], [a, b, 999], [a, a], [b, 999], 'a,b', [a, 'x']]) {
      expect((await conAdmin(request(app).patch(url)).send({ ids })).status).toBe(400);
    }
    expect((await conAdmin(request(app).patch(url)).send({})).status).toBe(400);
    expect(await galeria()).toEqual([a, b]);
    expect((await conAdmin(request(app).patch('/api/productos/999999/imagenes/orden')).send({ ids: [] })).status).toBe(404);
  });

  it('reemplazar la portada con PUT no toca la galería', async () => {
    const extra = (await subirImagen(creado.id_producto)).body.data.imagenes[0];

    const res = await enviarProducto('put', `/api/productos/${creado.id_producto}`, {}, { buffer: img.JPEG, filename: 'n.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(img.existeEnUploads(creado.imagen)).toBe(false);
    expect(img.existeEnUploads(extra.imagen)).toBe(true);
    expect(await galeriaDe(creado.id_producto)).toEqual([extra]);
  });

  it('un cliente recibe 403 en todas las rutas de la galería', async () => {
    const auth = (r) => r.set('Authorization', `Bearer ${tokenCliente}`);
    const id = creado.id_producto;
    expect((await auth(request(app).post(`/api/productos/${id}/imagenes`)).attach('imagen', img.PNG, 'a.png')).status).toBe(403);
    expect((await auth(request(app).patch(`/api/productos/${id}/imagenes/orden`)).send({ ids: [] })).status).toBe(403);
    expect((await auth(request(app).delete(`/api/productos/${id}/imagenes/1`))).status).toBe(403);
    expect((await auth(request(app).patch(`/api/productos/${id}/imagenes/1/portada`))).status).toBe(403);
  });
});

// B1 · Seguridad y robustez de la API: hallazgos H-02, H-03, H-05, H-06, H-12 y H-13 de la auditoría.
// Contrato: docs/diseno-tecnico/API_CONTRATOS.md, sección "Formato de respuesta" (413, 429, SIN_CAMBIOS).
import { createRequire } from 'node:module';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');
const app = require('../src/app.js');
const env = require('../src/config/env.js');
const limite = require('../src/middlewares/limite.middleware.js');
const { pool, limpiarUsuarios, fotoProductos, restaurarProductos } = require('./helpers/db.js');
const { PASSWORD, registrarYEntrar, conToken } = require('./helpers/sesion.js');
const { cargarConfig } = require('./helpers/config.js');
const { PNG, archivosEnUploads, borrarNuevos } = require('./helpers/imagenes.js');

const CLIENTE = { nombre: 'Ana Cliente', email: 'ana@prueba.local' };
const ADMIN = { nombre: 'Admin Tienda', email: 'admin@prueba.local' };

const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });
const recuperar = (email) => request(app).post('/api/auth/recuperar').send({ email });

// Baja los topes del límite de intentos durante una prueba y los restaura al terminar.
async function conLimites(topes, prueba) {
  const originales = { ...env.limiteAuth };
  Object.assign(env.limiteAuth, topes);
  try {
    await prueba();
  } finally {
    Object.assign(env.limiteAuth, originales);
  }
}

beforeEach(async () => {
  await limpiarUsuarios();
  limite.reiniciarContadores();
});

afterEach(() => {
  vi.restoreAllMocks();
  limite.reiniciarContadores();
});

describe('Límite de intentos en /auth (H-02)', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({ ...CLIENTE, password: PASSWORD });
    limite.reiniciarContadores();
  });

  it('el login responde 429 DEMASIADOS_INTENTOS al pasar el tope de fallos de un correo, con Retry-After', async () => {
    await conLimites({ porCorreo: 3 }, async () => {
      for (let i = 0; i < 3; i += 1) expect((await login(CLIENTE.email, 'Mala1234')).status).toBe(401);

      const bloqueado = await login(CLIENTE.email, PASSWORD); // aun con la clave correcta
      expect(bloqueado.status).toBe(429);
      expect(bloqueado.body).toEqual({
        ok: false,
        code: 'DEMASIADOS_INTENTOS',
        message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo'
      });
      expect(Number(bloqueado.headers['retry-after'])).toBeGreaterThan(0);
      expect(bloqueado.headers.ratelimit).toBeDefined();
    });
  });

  it('el tope es por correo, sin distinguir mayúsculas, y los logins correctos no gastan cupo', async () => {
    await conLimites({ porCorreo: 2 }, async () => {
      for (let i = 0; i < 4; i += 1) expect((await login(CLIENTE.email, PASSWORD)).status).toBe(200);
      await login('ANA@prueba.local', 'Mala1234');
      await login(' ana@PRUEBA.local ', 'Mala1234');

      expect((await login(CLIENTE.email, PASSWORD)).status).toBe(429);
      expect((await login('otro@prueba.local', 'Mala1234')).status).toBe(401); // otro correo sigue libre
    });
  });

  it('recuperar cuenta todas las solicitudes de un correo', async () => {
    await conLimites({ porCorreo: 2 }, async () => {
      expect((await recuperar(CLIENTE.email)).status).toBe(200);
      expect((await recuperar(CLIENTE.email)).status).toBe(200);
      expect((await recuperar(CLIENTE.email)).status).toBe(429);
    });
  });

  it('login, recuperar y registro comparten un tope por IP', async () => {
    await conLimites({ porIp: 3 }, async () => {
      await login('uno@prueba.local', 'Mala1234');
      await recuperar('dos@prueba.local');
      await request(app).post('/api/auth/register').send({ nombre: 'Tres', email: 'tres@prueba.local', password: PASSWORD });

      const res = await request(app).post('/api/auth/register').send({ nombre: 'Cuatro', email: 'cuatro@prueba.local', password: PASSWORD });
      expect(res.status).toBe(429);
      expect(res.body.code).toBe('DEMASIADOS_INTENTOS');
      expect((await pool.query("SELECT 1 FROM usuarios WHERE email = 'cuatro@prueba.local'")).rowCount).toBe(0);
    });
  });

  it('las rutas con sesión no tienen este límite', async () => {
    const token = await registrarYEntrar({ nombre: 'Luis', email: 'luis@prueba.local' });
    await conLimites({ porIp: 1, porCorreo: 1 }, async () => {
      for (let i = 0; i < 3; i += 1) expect((await conToken(token).get('/api/auth/me')).status).toBe(200);
    });
  });
});

describe('Configuración segura por omisión (H-03)', () => {
  it.each([
    ['el secreto de ejemplo', 'cambia_este_secreto_por_uno_largo'],
    ['el secreto de las pruebas', 'secreto_solo_para_pruebas_automatizadas_no_usar_en_produccion'],
    ['un secreto de menos de 32 caracteres', 'corto-pero-no-tanto-1234']
  ])('en producción, la API se niega a cargar con %s', (_caso, secreto) => {
    expect(cargarConfig({ NODE_ENV: 'production', JWT_SECRET: secreto }, 'jwt.secret')).toMatch(/^ERROR: JWT_SECRET no es seguro/);
  });

  it('en producción acepta un secreto largo; en desarrollo el de ejemplo sigue funcionando como hasta ahora', () => {
    const fuerte = 'k'.repeat(48);
    expect(cargarConfig({ NODE_ENV: 'production', JWT_SECRET: fuerte }, 'jwt.secret')).toBe(fuerte);
    expect(cargarConfig({ NODE_ENV: 'development', JWT_SECRET: 'cambia_este_secreto_por_uno_largo' }, 'jwt.secret')).toBe(
      'cambia_este_secreto_por_uno_largo'
    );
  });
});

describe('Entradas inválidas responden 4xx, nunca 500 (H-05)', () => {
  let admin;
  let tokenAdmin;
  let foto;

  beforeAll(async () => {
    foto = await fotoProductos();
  });

  beforeEach(async () => {
    tokenAdmin = await registrarYEntrar(ADMIN, 'admin');
    admin = conToken(tokenAdmin);
  });

  afterEach(async () => {
    await restaurarProductos(foto);
  });

  it('un cuerpo JSON de más de 100 kB responde 413', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'a'.repeat(200 * 1024), email: 'x@prueba.local', password: PASSWORD });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ ok: false, message: 'El cuerpo de la solicitud supera el tamaño permitido (100 kB)' });
  });

  it.each([
    ['GET /api/productos/:id', () => request(app).get('/api/productos/99999999999')],
    ['PATCH /api/usuarios/:id/rol', () => admin.patch('/api/usuarios/99999999999/rol', { rol: 'admin' })]
  ])('un id fuera del rango de INT responde 400: %s', async (_caso, pedir) => {
    const res = await pedir();
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('El campo id admite como máximo 2147483647');
  });

  it('existencias por encima del máximo responden 400 y no dejan la imagen en disco', async () => {
    const antes = archivosEnUploads();
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('nombre', 'Producto enorme')
      .field('id_categoria', '1')
      .field('precio', '1000')
      .field('existencias', '9999999999')
      .attach('imagen', PNG, { filename: 'x.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('El campo existencias admite como máximo 2147483647');
    expect(archivosEnUploads()).toEqual(antes);
    borrarNuevos(antes);
  });

  it.each([
    ['un objeto', { a: 1 }],
    ['un número', 12345678],
    ['un arreglo', ['Clave1234']]
  ])('un password que es %s responde 400 en el login', async (_caso, password) => {
    const res = await login(ADMIN.email, password);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email y password son obligatorios');
  });
});

describe('Cabeceras de seguridad (H-06)', () => {
  it.each(['/api/health', '/api/ruta-que-no-existe', '/uploads/productos/no-existe.png'])('%s', async (url) => {
    const res = await request(app).get(url);

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });
});

describe('El login compara la contraseña aunque el correo no exista (H-12)', () => {
  it('con un correo inexistente también ejecuta bcrypt.compare, así tarda lo mismo', async () => {
    const comparar = vi.spyOn(bcrypt, 'compare');

    const res = await login('nadie@prueba.local', 'Clave1234');

    expect(res.status).toBe(401);
    expect(comparar).toHaveBeenCalledTimes(1);
    expect(comparar.mock.calls[0][1]).toMatch(/^\$2b\$10\$/);
  });
});

describe('Pedir el valor que ya tiene responde 409 SIN_CAMBIOS (H-13)', () => {
  let admin;
  let foto;
  let idCliente;

  beforeAll(async () => {
    foto = await fotoProductos();
  });

  beforeEach(async () => {
    admin = conToken(await registrarYEntrar(ADMIN, 'admin'));
    await registrarYEntrar(CLIENTE);
    idCliente = (await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1', [CLIENTE.email])).rows[0].id_usuario;
  });

  afterEach(async () => {
    await restaurarProductos(foto);
  });

  it.each([
    ['el rol (CU-20 4.2)', (id) => admin.patch(`/api/usuarios/${id}/rol`, { rol: 'cliente' }), 'El usuario ya tiene el rol cliente'],
    ['el estado de la cuenta (CU-21 2.1)', (id) => admin.patch(`/api/usuarios/${id}/estado`, { estado: 'activo' }), 'La cuenta ya se encuentra activa']
  ])('usuario: %s', async (_caso, pedir, mensaje) => {
    const res = await pedir(idCliente);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ ok: false, code: 'SIN_CAMBIOS', message: mensaje });
  });

  it('cuenta desactivada: volver a desactivarla también lo informa', async () => {
    expect((await admin.patch(`/api/usuarios/${idCliente}/estado`, { estado: 'inactivo' })).status).toBe(200);
    const res = await admin.patch(`/api/usuarios/${idCliente}/estado`, { estado: 'inactivo' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('La cuenta ya se encuentra desactivada');
  });

  it('producto (CU-14 2.1): inactivar uno inactivo responde 409 y no cambia nada', async () => {
    const { id_producto } = (await pool.query("SELECT id_producto FROM productos WHERE estado = 'activo' LIMIT 1")).rows[0];
    expect((await admin.patch(`/api/productos/${id_producto}/estado`, { estado: 'inactivo' })).status).toBe(200);

    const res = await admin.patch(`/api/productos/${id_producto}/estado`, { estado: 'inactivo' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ ok: false, code: 'SIN_CAMBIOS', message: 'El producto ya se encuentra inactivo' });
  });

  it('un producto que no existe sigue respondiendo 404', async () => {
    expect((await admin.patch('/api/productos/999999/estado', { estado: 'activo' })).status).toBe(404);
  });
});

// Pruebas de administración de usuarios y control de acceso: CU-19 a CU-22 (D5, D6, decisión G).
// Contratos: docs/diseno-tecnico/API_CONTRATOS.md, sección "Usuarios · admin".
import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const app = require('../src/app.js');
const env = require('../src/config/env.js');
const { pool, limpiarUsuarios, cambiarEstadoUsuario, cambiarRolUsuario } = require('./helpers/db.js');
const { registrarYEntrar, conToken } = require('./helpers/sesion.js');

const ADMIN = { nombre: 'Admin Tienda', email: 'admin@prueba.local' };
const OTRO_ADMIN = { nombre: 'Beatriz Admin', email: 'beatriz@prueba.local' };
const ANA = { nombre: 'Ana Pérez', email: 'ana_perez@prueba.local' };
const CARLOS = { nombre: 'Carlos Ruiz', email: 'carlos@otro.local' };
const DIANA = { nombre: 'Diana Gómez', email: 'diana@prueba.local' };

const idDe = async (email) =>
  (await pool.query('SELECT id_usuario FROM usuarios WHERE lower(email) = lower($1)', [email])).rows[0].id_usuario;
const filaDe = async (email) =>
  (await pool.query('SELECT rol, estado FROM usuarios WHERE lower(email) = lower($1)', [email])).rows[0];
const nombres = (res) => res.body.data.map((u) => u.nombre);

let admin;

beforeEach(async () => {
  await limpiarUsuarios();
  admin = conToken(await registrarYEntrar(ADMIN, 'admin'));
});

describe('GET /api/usuarios · CU-19', () => {
  beforeEach(async () => {
    await registrarYEntrar(OTRO_ADMIN, 'admin');
    await registrarYEntrar(ANA);
    await registrarYEntrar(CARLOS);
    await registrarYEntrar(DIANA);
    await cambiarEstadoUsuario(DIANA.email, 'inactivo');
  });

  it('sin token responde 401 y con un cliente responde 403', async () => {
    const cliente = conToken(await registrarYEntrar({ nombre: 'Eva', email: 'eva@prueba.local' }));

    expect((await request(app).get('/api/usuarios')).status).toBe(401);
    const res = await cliente.get('/api/usuarios');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ ok: false, message: 'No tienes permisos para realizar esta operación' });
  });

  it('el admin recibe todos los usuarios ordenados por nombre y sin la contraseña', async () => {
    const res = await admin.get('/api/usuarios');

    expect(res.status).toBe(200);
    expect(nombres(res)).toEqual(['Admin Tienda', 'Ana Pérez', 'Beatriz Admin', 'Carlos Ruiz', 'Diana Gómez']);
    for (const usuario of res.body.data) {
      expect(Object.keys(usuario).sort()).toEqual(['created_at', 'email', 'estado', 'id_usuario', 'nombre', 'rol']);
    }
  });

  it('q busca por nombre o por correo, como "contiene" y sin distinguir mayúsculas', async () => {
    expect(nombres(await admin.get('/api/usuarios?q=PÉREZ'))).toEqual(['Ana Pérez']); // por nombre
    expect(nombres(await admin.get('/api/usuarios?q=OTRO.local'))).toEqual(['Carlos Ruiz']); // por correo
    expect(nombres(await admin.get('/api/usuarios?q=admin'))).toEqual(['Admin Tienda', 'Beatriz Admin']);
  });

  it('q busca % y _ como texto, no como comodines', async () => {
    expect(nombres(await admin.get('/api/usuarios?q=_'))).toEqual(['Ana Pérez']); // solo el correo que tiene "_"
    expect(nombres(await admin.get(`/api/usuarios?q=${encodeURIComponent('%')}`))).toEqual([]);
    expect(nombres(await admin.get('/api/usuarios?q=a_p'))).toEqual(['Ana Pérez']);
    expect(nombres(await admin.get('/api/usuarios?q=n_p'))).toEqual([]); // con comodín coincidiría con "Ana Pérez"
    const barra = await admin.get(`/api/usuarios?q=${encodeURIComponent('\\')}`); // la barra invertida tampoco rompe la búsqueda
    expect(barra.status).toBe(200);
    expect(barra.body.data).toEqual([]);
  });

  it('filtra por rol y por estado, también combinados con q', async () => {
    expect(nombres(await admin.get('/api/usuarios?rol=admin'))).toEqual(['Admin Tienda', 'Beatriz Admin']);
    expect(nombres(await admin.get('/api/usuarios?estado=inactivo'))).toEqual(['Diana Gómez']);
    expect(nombres(await admin.get('/api/usuarios?rol=cliente&estado=activo'))).toEqual(['Ana Pérez', 'Carlos Ruiz']);
    expect(nombres(await admin.get('/api/usuarios?q=prueba&rol=cliente&estado=activo'))).toEqual(['Ana Pérez']);
  });

  it.each([
    ['rol inválido', 'rol=superusuario'],
    ['estado inválido', 'estado=borrado']
  ])('responde 400 con %s', async (_caso, query) => {
    const res = await admin.get(`/api/usuarios?${query}`);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('PATCH /api/usuarios/:id/rol y /estado · CU-20, CU-21', () => {
  it('cambia el rol de otro usuario y devuelve el usuario sin contraseña', async () => {
    await registrarYEntrar(ANA);

    const res = await admin.patch(`/api/usuarios/${await idDe(ANA.email)}/rol`, { rol: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Rol actualizado');
    expect(res.body.data).toMatchObject({ email: ANA.email, rol: 'admin' });
    expect(res.body.data).not.toHaveProperty('password');
    expect((await filaDe(ANA.email)).rol).toBe('admin');
  });

  it('cambia el estado de otro usuario', async () => {
    await registrarYEntrar(ANA);

    const res = await admin.patch(`/api/usuarios/${await idDe(ANA.email)}/estado`, { estado: 'inactivo' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Estado actualizado');
    expect(res.body.data).toMatchObject({ email: ANA.email, estado: 'inactivo' });
  });

  it('un admin puede cambiar el rol o desactivar a OTRO admin (el contrato no lo prohíbe)', async () => {
    await registrarYEntrar(OTRO_ADMIN, 'admin');
    const idOtro = await idDe(OTRO_ADMIN.email);

    expect((await admin.patch(`/api/usuarios/${idOtro}/estado`, { estado: 'inactivo' })).status).toBe(200);
    expect((await admin.patch(`/api/usuarios/${idOtro}/rol`, { rol: 'cliente' })).status).toBe(200);
    expect(await filaDe(OTRO_ADMIN.email)).toEqual({ rol: 'cliente', estado: 'inactivo' });
  });

  it.each([
    ['su propio rol (D5)', 'rol', { rol: 'cliente' }, 'No puedes cambiar tu propio rol'],
    ['su propio estado (D6)', 'estado', { estado: 'inactivo' }, 'No puedes cambiar el estado de tu propia cuenta']
  ])('un admin no puede cambiar %s: 400 ACCION_SOBRE_SI_MISMO y la base no cambia', async (_caso, ruta, cuerpo, mensaje) => {
    const res = await admin.patch(`/api/usuarios/${await idDe(ADMIN.email)}/${ruta}`, cuerpo);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ ok: false, message: mensaje, code: 'ACCION_SOBRE_SI_MISMO' });
    expect(await filaDe(ADMIN.email)).toEqual({ rol: 'admin', estado: 'activo' });
  });

  it.each([
    ['no numérico', 'abc'],
    ['cero', '0'],
    ['negativo', '-3'],
    ['decimal', '1.5']
  ])('responde 400 con un id %s', async (_caso, id) => {
    expect((await admin.patch(`/api/usuarios/${id}/rol`, { rol: 'admin' })).status).toBe(400);
    expect((await admin.patch(`/api/usuarios/${id}/estado`, { estado: 'activo' })).status).toBe(400);
  });

  it('responde 404 si el usuario no existe', async () => {
    expect((await admin.patch('/api/usuarios/99999/rol', { rol: 'admin' })).status).toBe(404);
    expect((await admin.patch('/api/usuarios/99999/estado', { estado: 'activo' })).status).toBe(404);
  });

  it('responde 400 con un valor inválido o sin cuerpo', async () => {
    await registrarYEntrar(ANA);
    const id = await idDe(ANA.email);

    expect((await admin.patch(`/api/usuarios/${id}/rol`, { rol: 'superusuario' })).status).toBe(400);
    expect((await admin.patch(`/api/usuarios/${id}/estado`, { estado: 'borrado' })).status).toBe(400);
    expect((await admin.patch(`/api/usuarios/${id}/rol`)).status).toBe(400);
    expect((await admin.patch(`/api/usuarios/${id}/estado`)).status).toBe(400);
  });

  it('un cliente no puede cambiar roles ni estados (403)', async () => {
    const cliente = conToken(await registrarYEntrar(ANA));
    const idAdmin = await idDe(ADMIN.email);

    expect((await cliente.patch(`/api/usuarios/${idAdmin}/rol`, { rol: 'cliente' })).status).toBe(403);
    expect((await cliente.patch(`/api/usuarios/${idAdmin}/estado`, { estado: 'inactivo' })).status).toBe(403);
  });
});

describe('Control de acceso en cada petición · CU-22, decisión G', () => {
  it('una cuenta desactivada pierde el acceso de inmediato aunque su token siga vigente', async () => {
    const otroAdmin = conToken(await registrarYEntrar(OTRO_ADMIN, 'admin'));
    await admin.patch(`/api/usuarios/${await idDe(OTRO_ADMIN.email)}/estado`, { estado: 'inactivo' });

    for (const res of [await otroAdmin.get('/api/auth/me'), await otroAdmin.get('/api/usuarios')]) {
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CUENTA_DESACTIVADA');
    }
  });

  it('un cliente ascendido a admin puede administrar sin volver a iniciar sesión', async () => {
    const ana = conToken(await registrarYEntrar(ANA));
    expect((await ana.get('/api/usuarios')).status).toBe(403);

    await admin.patch(`/api/usuarios/${await idDe(ANA.email)}/rol`, { rol: 'admin' });

    expect((await ana.get('/api/usuarios')).status).toBe(200);
  });

  it('un admin degradado a cliente pierde el acceso sin volver a iniciar sesión', async () => {
    const otroAdmin = conToken(await registrarYEntrar(OTRO_ADMIN, 'admin'));
    expect((await otroAdmin.get('/api/usuarios')).status).toBe(200);

    await cambiarRolUsuario(OTRO_ADMIN.email, 'cliente');

    expect((await otroAdmin.get('/api/usuarios')).status).toBe(403);
  });

  it('GET /api/auth/me devuelve el usuario actual sin la contraseña', async () => {
    const res = await admin.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: ADMIN.email, rol: 'admin', estado: 'activo' });
    expect(res.body.data).not.toHaveProperty('password');
  });

  describe('tokens que no sirven responden 401', () => {
    let idAdmin;
    beforeEach(async () => {
      idAdmin = await idDe(ADMIN.email);
    });

    it('firmado con otra clave', async () => {
      const token = jwt.sign({ id_usuario: idAdmin, rol: 'admin' }, 'otra_clave_que_no_es_la_del_servidor');
      const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ ok: false, message: 'Token inválido o expirado' });
    });

    it('vencido', async () => {
      const token = jwt.sign({ id_usuario: idAdmin, rol: 'admin', exp: Math.floor(Date.now() / 1000) - 60 }, env.jwt.secret);
      const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it.each([
      ['sin la palabra Bearer', (t) => t],
      ['con otro esquema', (t) => `Basic ${t}`],
      ['vacío', () => 'Bearer ']
    ])('con la cabecera %s', async (_caso, cabecera) => {
      const token = jwt.sign({ id_usuario: idAdmin }, env.jwt.secret);
      const res = await request(app).get('/api/usuarios').set('Authorization', cabecera(token));

      expect(res.status).toBe(401);
    });

    it('de un usuario que ya no existe en la base', async () => {
      const token = jwt.sign({ id_usuario: 99999, rol: 'admin' }, env.jwt.secret);
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ ok: false, message: 'Sesión inválida' });
    });
  });
});

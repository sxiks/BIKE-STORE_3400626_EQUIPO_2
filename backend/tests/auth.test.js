// Pruebas de la API de autenticación: CU-09 (registro), CU-10 (login), CU-11 (recuperación)
// y el cierre de las sesiones abiertas al restablecer la contraseña (auditoría H-04).
// Contratos: docs/diseno-tecnico/API_CONTRATOS.md, sección "Autenticación · Sprint 1".
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const app = require('../src/app.js');
const env = require('../src/config/env.js');
const { pool, limpiarUsuarios, cambiarEstadoUsuario, vencerTokensDe } = require('./helpers/db.js');
const { cargarConfig } = require('./helpers/config.js');

const PASSWORD = 'Clave1234';
const NUEVA_PASSWORD = 'NuevaClave99';
const CLIENTE = { nombre: 'Ana Cliente', email: 'ana@prueba.local', password: PASSWORD };

const registrar = (datos = CLIENTE) => request(app).post('/api/auth/register').send(datos);
const login = (email = CLIENTE.email, password = PASSWORD) =>
  request(app).post('/api/auth/login').send({ email, password });
const recuperar = (email = CLIENTE.email) => request(app).post('/api/auth/recuperar').send({ email });
const restablecer = (token, password = NUEVA_PASSWORD) =>
  request(app).post('/api/auth/restablecer').send({ token, password });

beforeEach(async () => {
  await limpiarUsuarios();
  // La recuperación imprime el token en consola: se silencia para que la salida de las pruebas sea legible.
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Cambia temporalmente un valor de la configuración ya cargada y lo restaura al terminar.
async function conConfig(objeto, clave, valor, prueba) {
  const original = objeto[clave];
  objeto[clave] = valor;
  try {
    await prueba();
  } finally {
    objeto[clave] = original;
  }
}

describe('POST /api/auth/register · CU-09', () => {
  it('crea un cliente y responde 201 con su id', async () => {
    const res = await registrar();

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, message: 'Usuario registrado' });
    expect(res.body.data.id_usuario).toEqual(expect.any(Number));

    const { rows } = await pool.query('SELECT email, rol, estado, password FROM usuarios');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: CLIENTE.email, rol: 'cliente', estado: 'activo' });
    expect(rows[0].password).not.toBe(PASSWORD); // se guarda el hash bcrypt, nunca la contraseña
  });

  it('guarda el correo sin espacios y en minúsculas', async () => {
    await registrar({ ...CLIENTE, email: '  ANA@Prueba.LOCAL ' });

    const { rows } = await pool.query('SELECT email FROM usuarios');
    expect(rows[0].email).toBe('ana@prueba.local');
  });

  it('responde 409 si el correo ya existe, sin distinguir mayúsculas', async () => {
    await registrar();
    const res = await registrar({ ...CLIENTE, email: 'ANA@PRUEBA.LOCAL' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ ok: false, message: 'El correo ya está registrado' });
  });

  it.each([
    ['menos de 8 caracteres', 'Abc123'],
    ['sin mayúscula', 'clave1234'],
    ['sin minúscula', 'CLAVE1234'],
    ['sin número', 'ClaveSegura']
  ])('responde 400 si la contraseña no cumple D7 (%s)', async (_caso, password) => {
    const res = await registrar({ ...CLIENTE, password });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/mínimo 8 caracteres/);
  });

  it('responde 400 si el correo no tiene un formato válido', async () => {
    const res = await registrar({ ...CLIENTE, email: 'ana-sin-arroba' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('El correo no tiene un formato válido');
  });

  it('responde 400 si falta el nombre', async () => {
    const res = await registrar({ ...CLIENTE, nombre: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('El campo nombre es obligatorio');
  });

  it('responde 400 (no 500) si la petición llega sin cuerpo', async () => {
    const res = await request(app).post('/api/auth/register');

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('responde 400 si el cuerpo no es JSON válido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"nombre": "Ana",');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ ok: false, message: 'El cuerpo de la solicitud no es JSON válido' });
  });
});

describe('POST /api/auth/login · CU-10', () => {
  beforeEach(async () => {
    await registrar();
  });

  it('responde 200 con el token y el usuario, sin la contraseña', async () => {
    const res = await login();

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ email: CLIENTE.email, rol: 'cliente', estado: 'activo' });
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('acepta el correo con mayúsculas y espacios', async () => {
    const res = await login('  Ana@PRUEBA.local ');

    expect(res.status).toBe(200);
  });

  it('el token sirve para consultar GET /api/auth/me', async () => {
    const { body } = await login();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: CLIENTE.email, rol: 'cliente' });
  });

  it('responde 401 con una contraseña incorrecta', async () => {
    const res = await login(CLIENTE.email, 'OtraClave123');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, message: 'Credenciales incorrectas' });
  });

  it('responde 401 con un correo que no existe (mismo mensaje: no revela qué cuentas existen)', async () => {
    const res = await login('nadie@prueba.local');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, message: 'Credenciales incorrectas' });
  });

  it('responde 400 si falta el correo o la contraseña', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: CLIENTE.email });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email y password son obligatorios');
  });

  it('responde 403 CUENTA_DESACTIVADA si la cuenta está inactiva (RF-29)', async () => {
    await cambiarEstadoUsuario(CLIENTE.email, 'inactivo');
    const res = await login();

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ ok: false, code: 'CUENTA_DESACTIVADA' });
  });
});

describe('POST /api/auth/recuperar · CU-11 (D8)', () => {
  const MENSAJE = 'Si el correo está registrado, se generó un enlace de recuperación';

  beforeEach(async () => {
    await registrar();
  });

  it('con un correo registrado responde 200 y, en desarrollo, devuelve token_desarrollo', async () => {
    const res = await recuperar();

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(MENSAJE);
    expect(res.body.data.token_desarrollo).toMatch(/^[a-f0-9]{64}$/);

    // En la base solo se guarda el hash SHA-256, nunca el token.
    const { rows } = await pool.query('SELECT token_hash FROM tokens_recuperacion');
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toBe(res.body.data.token_desarrollo);
  });

  it('con un correo NO registrado responde igual, sin token y sin crear registros', async () => {
    const res = await recuperar('nadie@prueba.local');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, message: MENSAJE });

    const { rows } = await pool.query('SELECT count(*)::int AS total FROM tokens_recuperacion');
    expect(rows[0].total).toBe(0);
  });

  it('con una cuenta desactivada responde igual y no genera token', async () => {
    await cambiarEstadoUsuario(CLIENTE.email, 'inactivo');
    const res = await recuperar();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, message: MENSAJE });
  });

  it('no devuelve el token si RESET_TOKEN_EN_RESPUESTA está apagado', async () => {
    await conConfig(env.resetToken, 'enRespuesta', false, async () => {
      const res = await recuperar();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, message: MENSAJE });
    });
  });

  // Desde B1 (H-03) la condición se decide en config/env.js con NODE_ENV escrito: se comprueba cargando
  // la configuración en un proceso aparte, con las variables de cada caso.
  it.each([
    ['NODE_ENV=production', { NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) }],
    ['sin NODE_ENV (no se supone desarrollo)', { NODE_ENV: undefined }]
  ])('no devuelve el token fuera de desarrollo, aunque RESET_TOKEN_EN_RESPUESTA esté encendido: %s', (_caso, variables) => {
    const salida = cargarConfig({ RESET_TOKEN_EN_RESPUESTA: 'true', ...variables }, 'resetToken.enRespuesta');
    expect(salida).toBe('false');
    expect(cargarConfig({ RESET_TOKEN_EN_RESPUESTA: 'true', NODE_ENV: 'development' }, 'resetToken.enRespuesta')).toBe('true');
  });

  it('responde 400 si el correo no tiene un formato válido', async () => {
    const res = await recuperar('correo-invalido');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/restablecer · CU-11 (D7, D8)', () => {
  let token;

  beforeEach(async () => {
    await registrar();
    token = (await recuperar()).body.data.token_desarrollo;
  });

  it('cambia la contraseña: la nueva funciona y la anterior ya no', async () => {
    const res = await restablecer(token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión' });
    expect((await login(CLIENTE.email, NUEVA_PASSWORD)).status).toBe(200);
    expect((await login(CLIENTE.email, PASSWORD)).status).toBe(401);
  });

  it('el token es de un solo uso', async () => {
    await restablecer(token);
    const res = await restablecer(token, 'OtraClave77');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TOKEN_INVALIDO');
  });

  it('pedir un token nuevo invalida el anterior', async () => {
    const nuevo = (await recuperar()).body.data.token_desarrollo;

    const conAnterior = await restablecer(token);
    expect(conAnterior.status).toBe(400);
    expect(conAnterior.body.code).toBe('TOKEN_INVALIDO');

    expect((await restablecer(nuevo)).status).toBe(200);
  });

  it('rechaza un token vencido', async () => {
    await vencerTokensDe(CLIENTE.email);
    const res = await restablecer(token);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TOKEN_INVALIDO');
  });

  it.each([
    ['con formato inválido', 'no-es-un-token'],
    ['que no existe', 'a'.repeat(64)],
    ['ausente', undefined]
  ])('responde 400 TOKEN_INVALIDO con un token %s', async (_caso, tokenPrueba) => {
    const res = await restablecer(tokenPrueba);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TOKEN_INVALIDO');
  });

  it('valida D7 en la nueva contraseña y no consume el token', async () => {
    const debil = await restablecer(token, 'debil');
    expect(debil.status).toBe(400);
    expect(debil.body.message).toMatch(/mínimo 8 caracteres/);

    expect((await restablecer(token)).status).toBe(200); // el token seguía vigente
  });
});

describe('Sesiones abiertas al restablecer la contraseña (auditoría H-04)', () => {
  const me = (token) => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  const entrar = async (password = PASSWORD) => (await login(CLIENTE.email, password)).body.data.token;
  const restablecerAhora = async () => {
    const tokenRecuperacion = (await recuperar()).body.data.token_desarrollo;
    expect((await restablecer(tokenRecuperacion)).status).toBe(200);
  };
  // Token como los firmados antes de este cambio: sin emitido_ms, solo con iat (en segundos).
  const tokenSinEmitidoMs = (idUsuario, segundosAtras) =>
    jwt.sign(
      { id_usuario: idUsuario, rol: 'cliente', iat: Math.floor(Date.now() / 1000) - segundosAtras },
      env.jwt.secret,
      { expiresIn: '2h' }
    );

  let idCliente;

  beforeEach(async () => {
    idCliente = (await registrar()).body.data.id_usuario;
  });

  it('el token emitido antes del restablecimiento responde 401 SESION_REVOCADA', async () => {
    const anterior = await entrar();
    expect((await me(anterior)).status).toBe(200);

    await restablecerAhora();
    const res = await me(anterior);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      ok: false,
      code: 'SESION_REVOCADA',
      message: 'Tu contraseña cambió. Inicia sesión de nuevo'
    });
  });

  it('cierra todas las sesiones abiertas, no solo una', async () => {
    const enElPortatil = await entrar();
    const enElCelular = await entrar();

    await restablecerAhora();

    expect((await me(enElPortatil)).body.code).toBe('SESION_REVOCADA');
    expect((await me(enElCelular)).body.code).toBe('SESION_REVOCADA');
  });

  it('el login justo después (en el mismo segundo) funciona, y /auth/me no expone la fecha del cambio', async () => {
    await restablecerAhora();
    const res = await me(await entrar(NUEVA_PASSWORD));

    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('password_cambiada_en');
  });

  it('pedir la recuperación sin completarla no cierra la sesión', async () => {
    const token = await entrar();
    await recuperar();

    expect((await me(token)).status).toBe(200);
  });

  it('el restablecimiento de un usuario no afecta las sesiones de otro', async () => {
    const otro = { nombre: 'Beto Cliente', email: 'beto@prueba.local', password: PASSWORD };
    await registrar(otro);
    const tokenOtro = (await login(otro.email)).body.data.token;

    await restablecerAhora();

    expect((await me(tokenOtro)).status).toBe(200);
  });

  it('un token sin emitido_ms (firmado antes de este cambio) se compara por iat', async () => {
    const antiguo = tokenSinEmitidoMs(idCliente, 60);
    expect((await me(antiguo)).status).toBe(200); // nunca ha restablecido: sigue sirviendo

    await restablecerAhora();

    expect((await me(antiguo)).body.code).toBe('SESION_REVOCADA');
  });

  it('una cuenta desactivada sigue respondiendo 403 CUENTA_DESACTIVADA aunque haya restablecido', async () => {
    const anterior = await entrar();
    await restablecerAhora();
    await cambiarEstadoUsuario(CLIENTE.email, 'inactivo');

    const res = await me(anterior);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CUENTA_DESACTIVADA');
  });
});

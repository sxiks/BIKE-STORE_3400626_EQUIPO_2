// Utilidades de sesión compartidas por las pruebas: registrar un usuario, darle un rol e iniciar sesión.
const request = require('supertest');
const app = require('../../src/app');
const { cambiarRolUsuario } = require('./db');

const PASSWORD = 'Clave1234';

// Registra al usuario por la API (opcionalmente le cambia el rol en la base) y devuelve su token.
async function registrarYEntrar(usuario, rol) {
  await request(app).post('/api/auth/register').send({ password: PASSWORD, ...usuario });
  if (rol) await cambiarRolUsuario(usuario.email, rol);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: usuario.email, password: usuario.password ?? PASSWORD });
  return res.body.data.token;
}

// Atajos de Supertest con la cabecera Authorization ya puesta.
const conToken = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url, body) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body),
  put: (url, body) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body),
  patch: (url, body) => request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body),
  del: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
});

module.exports = { PASSWORD, registrarYEntrar, conToken };

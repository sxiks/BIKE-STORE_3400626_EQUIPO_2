// Mensajes al no poder conectar con PostgreSQL (server.js y npm run test:db).
// Antes, con DB_HOST=localhost y la base apagada o en otro puerto, se imprimía
// "No se pudo iniciar la API: " sin nada más (AggregateError con message vacío).
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { describirErrorConexion } = require('../src/utils/errorConexion.js');

const RUTA_SERVER = path.resolve(__dirname, '..', 'server.js');
const DESTINO = { host: 'localhost', port: 5433 };

// Igual que el error real de Node cuando fallan 127.0.0.1 y ::1.
function errorDeLocalhost(code) {
  const error = new AggregateError(
    [new Error(`connect ${code} 127.0.0.1:5433`), new Error(`connect ${code} ::1:5433`)],
    ''
  );
  error.code = code;
  return error;
}

// Un puerto en el que seguro no escucha nadie: se abre, se anota y se cierra.
function puertoLibre() {
  return new Promise((resolve) => {
    const servidor = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = servidor.address();
      servidor.close(() => resolve(port));
    });
  });
}

describe('describirErrorConexion', () => {
  it('ECONNREFUSED con mensaje vacío: dice dónde buscó y qué revisar', () => {
    const texto = describirErrorConexion(errorDeLocalhost('ECONNREFUSED'), DESTINO);

    expect(texto).toBe(
      'ECONNREFUSED: no hay PostgreSQL escuchando en localhost:5433. Revisa que la base esté encendida y que DB_PORT de tu .env sea el correcto (5433 con Docker, 5432 sin Docker)'
    );
  });

  it('en npm run test:db nombra el archivo .env.test', () => {
    const texto = describirErrorConexion(errorDeLocalhost('ECONNREFUSED'), { ...DESTINO, archivo: '.env.test' });

    expect(texto).toContain('que DB_PORT de tu .env.test sea el correcto');
  });

  it('un servidor que no existe apunta a DB_HOST', () => {
    const error = Object.assign(new Error('getaddrinfo ENOTFOUND base-que-no-existe'), { code: 'ENOTFOUND' });

    expect(describirErrorConexion(error, { host: 'base-que-no-existe', port: 5432 })).toBe(
      'ENOTFOUND: no se encontró el servidor "base-que-no-existe". Revisa DB_HOST en tu .env'
    );
  });

  it('un error de PostgreSQL con su propio mensaje se muestra tal cual', () => {
    const error = Object.assign(new Error('password authentication failed for user "bike_store_app"'), {
      code: '28P01'
    });

    expect(describirErrorConexion(error, DESTINO)).toBe('password authentication failed for user "bike_store_app"');
  });

  it('un AggregateError sin pista conocida muestra los mensajes internos', () => {
    const texto = describirErrorConexion(errorDeLocalhost('EHOSTUNREACH'), DESTINO);

    expect(texto).toBe('connect EHOSTUNREACH 127.0.0.1:5433; connect EHOSTUNREACH ::1:5433');
  });

  it('nunca devuelve un texto vacío', () => {
    expect(describirErrorConexion(Object.assign(new Error(''), { code: 'EOTRO' }))).toBe('EOTRO');
    expect(describirErrorConexion('falló')).toBe('falló');
  });
});

describe('Arranque de la API sin PostgreSQL', () => {
  it('server.js termina con código 1 y explica el problema, en lugar de un mensaje vacío', async () => {
    const puerto = await puertoLibre();
    const entorno = {
      PATH: process.env.PATH,
      NODE_ENV: 'development',
      DB_HOST: 'localhost',
      DB_PORT: String(puerto),
      DB_NAME: 'bike_store_test',
      DB_USER: 'u',
      DB_PASSWORD: 'p',
      JWT_SECRET: 'secreto_solo_para_pruebas_automatizadas_no_usar_en_produccion'
    };
    // cwd en una carpeta temporal: así dotenv no encuentra el backend/.env de desarrollo.
    const { status, stderr } = spawnSync(process.execPath, [RUTA_SERVER], {
      cwd: os.tmpdir(),
      env: entorno,
      encoding: 'utf8',
      timeout: 15000
    });

    expect(status).toBe(1);
    expect(stderr).toContain(`No se pudo iniciar la API: ECONNREFUSED: no hay PostgreSQL escuchando en localhost:${puerto}.`);
  });
});

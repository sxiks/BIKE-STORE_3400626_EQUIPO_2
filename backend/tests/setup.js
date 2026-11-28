// Se ejecuta antes de cada archivo de pruebas.
// 1) Carga .env.test (con su guarda de seguridad) ANTES de que la app lea la configuración.
// 2) Al terminar el archivo, cierra el pool de PostgreSQL para que Vitest pueda salir.
//
// El backend es CommonJS: tanto aquí como en las pruebas se carga con require (createRequire)
// para que la app, los helpers y este archivo compartan la MISMA instancia del pool y de la config.
import { createRequire } from 'node:module';
import { afterAll } from 'vitest';

const require = createRequire(import.meta.url);
const { cargarEnvTest } = require('./helpers/cargarEnvTest.js');

cargarEnvTest();

// Límite de intentos de /auth (B1): las pruebas inician sesión muchas veces desde la misma IP.
// Si .env.test no trae estos valores (los .env.test creados antes de B1), se usan topes altos;
// tests/seguridad.test.js los baja a propósito para probar el 429.
process.env.AUTH_LIMITE_IP ??= '100000';
process.env.AUTH_LIMITE_CORREO ??= '100000';

afterAll(async () => {
  await require('../src/config/db.js').end();
});

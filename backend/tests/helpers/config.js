// Carga src/config/env.js en un proceso aparte con las variables indicadas y devuelve el valor pedido
// (o "ERROR: <mensaje>" si la configuración se niega a cargar). Sirve para probar decisiones que env.js toma
// al arrancar, como las de NODE_ENV y JWT_SECRET (B1 · H-03), sin tocar la configuración de las demás pruebas.
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const RUTA_ENV = path.resolve(__dirname, '..', '..', 'src', 'config', 'env.js');
const BASE = {
  DB_HOST: 'localhost',
  DB_USER: 'u',
  DB_PASSWORD: 'p',
  DB_NAME: 'bike_store_test',
  JWT_SECRET: 'secreto_solo_para_pruebas_automatizadas_no_usar_en_produccion'
};

// variables: { NOMBRE: 'valor' } · un valor undefined quita la variable. ruta: 'resetToken.enRespuesta'.
function cargarConfig(variables, ruta) {
  const entorno = { PATH: process.env.PATH, ...BASE, ...variables };
  Object.keys(entorno).forEach((k) => entorno[k] === undefined && delete entorno[k]);
  const script = `
    try {
      const env = require(${JSON.stringify(RUTA_ENV)});
      process.stdout.write(String(${JSON.stringify(ruta)}.split('.').reduce((o, k) => o[k], env)));
    } catch (error) {
      process.stdout.write('ERROR: ' + error.message);
    }`;
  // cwd en una carpeta temporal: así dotenv no encuentra el backend/.env de desarrollo.
  const { stdout } = spawnSync(process.execPath, ['-e', script], { cwd: os.tmpdir(), env: entorno, encoding: 'utf8' });
  return stdout;
}

module.exports = { cargarConfig };

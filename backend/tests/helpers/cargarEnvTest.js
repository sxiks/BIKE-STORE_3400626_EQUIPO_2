// Carga backend/.env.test y comprueba que apunte a una base de PRUEBAS.
// Lo usan el setup de Vitest y el script que prepara la base. Si algo no cuadra,
// lanza un error y no se ejecuta nada: así nunca se borra la base de desarrollo.
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const RUTA_ENV_TEST = path.resolve(__dirname, '..', '..', '.env.test');
const OBLIGATORIAS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];

function cargarEnvTest() {
  if (!fs.existsSync(RUTA_ENV_TEST)) {
    throw new Error(
      'Falta backend/.env.test. Créalo con: cp .env.test.example .env.test (ver backend/README.md, sección "Pruebas")'
    );
  }

  // Se validan las variables del ARCHIVO, no del entorno: si una falta aquí,
  // dotenv la tomaría después de .env (desarrollo) y eso es justo lo que se quiere evitar.
  const variables = dotenv.parse(fs.readFileSync(RUTA_ENV_TEST));
  const faltantes = OBLIGATORIAS.filter((nombre) => !variables[nombre]);
  if (faltantes.length > 0) {
    throw new Error(`backend/.env.test debe definir: ${faltantes.join(', ')}`);
  }
  if (!variables.DB_NAME.endsWith('_test')) {
    throw new Error(
      `DB_NAME en .env.test es "${variables.DB_NAME}". Debe terminar en _test: las pruebas borran los datos de esa base.`
    );
  }

  // override: las variables de .env.test ganan sobre las del entorno (incluido el NODE_ENV=test de Vitest).
  // Después, src/config/env.js carga .env sin override, así que no puede pisarlas.
  dotenv.config({ path: RUTA_ENV_TEST, override: true, quiet: true });
  return variables;
}

module.exports = { cargarEnvTest };

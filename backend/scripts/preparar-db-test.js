// npm run test:db
// Deja la base de PRUEBAS como recién creada: borra todo y aplica las migraciones 002 a 005.
// Usa el rol de la aplicación (dueño de la base), sin sudo ni superusuario.
// Solo acepta bases cuyo nombre termine en _test (ver tests/helpers/cargarEnvTest.js).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { cargarEnvTest } = require('../tests/helpers/cargarEnvTest');

// La 004 va sola en su archivo: agrega un valor al ENUM que la 005 usa (PostgreSQL exige confirmarlo antes).
const MIGRACIONES = [
  '002_modelo_bike_store.sql',
  '003_datos_semilla.sql',
  '004_estado_pedido_carrito.sql',
  '005_carrito_como_pedido.sql'
];
const CARPETA_MIGRACIONES = path.resolve(__dirname, '..', '..', 'database', 'migrations');

async function main() {
  const env = cargarEnvTest();
  const client = new Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  });

  await client.connect();
  try {
    console.log(`Preparando la base de pruebas "${env.DB_NAME}"...`);
    // El esquema public pertenece al dueño de la base (PostgreSQL 15+), por eso el rol puede recrearlo.
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

    for (const archivo of MIGRACIONES) {
      const sql = fs.readFileSync(path.join(CARPETA_MIGRACIONES, archivo), 'utf8');
      await client.query(sql); // cada migración trae su propio BEGIN/COMMIT
      console.log(`  ✓ ${archivo}`);
    }

    const { rows } = await client.query('SELECT count(*)::int AS total FROM productos');
    console.log(`Listo: ${rows[0].total} productos de la semilla cargados.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`No se pudo preparar la base de pruebas: ${error.message}`);
  process.exit(1);
});

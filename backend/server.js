const app = require('./src/app.js');
const env = require('./src/config/env.js');
const pool = require('./src/config/db.js');
const seedAdmin = require('./src/startup/seedAdmin.js');

async function start() {
  try {
    await pool.query('SELECT 1'); // falla rápido si PostgreSQL no está disponible
    await seedAdmin();
  } catch (error) {
    console.error('No se pudo iniciar la API:', error.message);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`Bike Store API ejecutándose en http://localhost:${env.port}`);
  });
}

start();

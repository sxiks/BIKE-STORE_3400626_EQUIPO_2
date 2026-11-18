// Pool de conexiones PostgreSQL. Solo lo importan los archivos de repositories/.
const { Pool, types } = require('pg');
const env = require('./env');

// Conversión explícita de tipos (decisión I):
// por defecto `pg` devuelve NUMERIC (precio, valor, SUM) e INT8 (COUNT) como texto.
// Los montos son COP con 2 decimales y caben sin pérdida en un Number de JS.
types.setTypeParser(1700, (valor) => (valor === null ? null : parseFloat(valor))); // NUMERIC
types.setTypeParser(20, (valor) => (valor === null ? null : parseInt(valor, 10)));  // INT8 / COUNT

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 10,
  // Zona horaria de la sesión (decisión J): fechas del tablero y año del número de pedido en hora local.
  options: `-c TimeZone=${env.db.timezone}`
});

module.exports = pool;

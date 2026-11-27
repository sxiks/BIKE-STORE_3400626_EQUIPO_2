require('dotenv').config({ quiet: true });

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Falta la variable de entorno: ${name}`);
  }
}

function entero(nombre, porDefecto, minimo = 1) {
  const valor = Number(process.env[nombre] ?? porDefecto);
  if (!Number.isInteger(valor) || valor < minimo) {
    throw new Error(`La variable ${nombre} debe ser un entero >= ${minimo}`);
  }
  return valor;
}

const timezone = process.env.DB_TIMEZONE || 'America/Bogota';
if (!/^[A-Za-z_]+(\/[A-Za-z_]+)*$/.test(timezone)) {
  throw new Error('DB_TIMEZONE no tiene un formato válido (ej. America/Bogota)');
}

const nodeEnv = process.env.NODE_ENV || 'development';

module.exports = {
  nodeEnv,
  isDev: nodeEnv === 'development',
  port: entero('PORT', 3000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST,
    port: entero('DB_PORT', 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '2h'
  },
  admin: {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  },
  stockBajoUmbral: entero('STOCK_BAJO_UMBRAL', 5, 0),
  resetToken: {
    minutos: entero('RESET_TOKEN_MINUTOS', 30),
    // Solo tiene efecto si NODE_ENV=development (ver docs/GUIA_PRUEBAS_LOCALES.md, sección 1)
    enRespuesta: process.env.RESET_TOKEN_EN_RESPUESTA === 'true'
  }
};

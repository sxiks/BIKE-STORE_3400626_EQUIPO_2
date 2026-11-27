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

// NODE_ENV se toma como 'development' si falta, pero las opciones que solo valen en desarrollo
// (como devolver el token de recuperación en la respuesta, decisión D8) exigen que esté ESCRITO:
// así una API publicada sin NODE_ENV no las activa por accidente (hallazgo H-03 de la auditoría).
const nodeEnvExplicito = process.env.NODE_ENV;
const nodeEnv = nodeEnvExplicito || 'development';
if (!nodeEnvExplicito) {
  console.warn('[config] NODE_ENV no está definido: se asume development. En un servidor, define NODE_ENV=production.');
}

// En producción el secreto del JWT no puede ser corto ni uno de los de ejemplo del repositorio:
// con un secreto conocido cualquiera podría firmar tokens válidos.
const SECRETOS_DE_EJEMPLO = [
  'cambia_este_secreto_por_uno_largo',
  'secreto_solo_para_pruebas_automatizadas_no_usar_en_produccion'
];
if (nodeEnv === 'production') {
  const secreto = process.env.JWT_SECRET;
  if (secreto.length < 32 || SECRETOS_DE_EJEMPLO.includes(secreto)) {
    throw new Error('JWT_SECRET no es seguro para producción: usa una cadena aleatoria de al menos 32 caracteres');
  }
}

module.exports = {
  nodeEnv,
  port: entero('PORT', 3000),
  // Saltos de proxy a confiar para leer la IP real del cliente (0 = ninguno, desarrollo local).
  trustProxy: entero('TRUST_PROXY', 0, 0),
  // Límite de intentos en /auth (B1 · H-02): por IP en login, recuperar y registro; por correo en login y recuperar.
  limiteAuth: {
    minutos: entero('AUTH_LIMITE_MINUTOS', 15),
    porIp: entero('AUTH_LIMITE_IP', 30),
    porCorreo: entero('AUTH_LIMITE_CORREO', 10)
  },
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
    // Solo tiene efecto con NODE_ENV=development ESCRITO en el .env (ver docs/GUIA_PRUEBAS_LOCALES.md, sección 1)
    enRespuesta: nodeEnvExplicito === 'development' && process.env.RESET_TOKEN_EN_RESPUESTA === 'true'
  }
};

// Límite de intentos en las rutas públicas de autenticación (B1 · hallazgo H-02 de la auditoría).
// Frena la fuerza bruta de contraseñas, el envío masivo de tokens de recuperación y el registro de cuentas basura.
//   - porIp: login, recuperar y registro comparten un contador por IP.
//   - loginPorCorreo: cuenta solo los intentos FALLIDOS de cada correo (un login correcto no gasta cupo).
//   - recuperarPorCorreo: cuenta todas las solicitudes de cada correo.
// Los contadores viven en la memoria del proceso: se reinician al reiniciar la API (suficiente para una sola instancia).
// Los topes se leen de env en cada petición: las pruebas pueden bajarlos sin recargar la app.
const { rateLimit, ipKeyGenerator, MemoryStore } = require('express-rate-limit');
const env = require('../config/env');
const v = require('../utils/validators');

const MENSAJE = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo';

const almacenes = [];

function crearLimite({ limite, clave, soloFallidos = false }) {
  const store = new MemoryStore();
  almacenes.push(store);
  return rateLimit({
    windowMs: env.limiteAuth.minutos * 60 * 1000,
    limit: limite,
    store,
    standardHeaders: 'draft-8', // cabeceras RateLimit-Policy y RateLimit; además Retry-After al pasarse
    legacyHeaders: false,
    skipSuccessfulRequests: soloFallidos,
    keyGenerator: clave,
    handler: (req, res) => res.status(429).json({ ok: false, code: 'DEMASIADOS_INTENTOS', message: MENSAJE })
  });
}

// La IP pasa por ipKeyGenerator: en IPv6 agrupa la subred /56, para que no se esquive cambiando de dirección.
const porIpLimite = crearLimite({ limite: () => env.limiteAuth.porIp, clave: (req) => ipKeyGenerator(req.ip) });

// Correo normalizado igual que en auth.services (minúsculas, sin espacios). Sin correo válido, cuenta la IP.
const claveCorreo = (prefijo) => (req) => `${prefijo}:${v.normalizarEmail(req.body?.email) || ipKeyGenerator(req.ip)}`;

const porCorreo = () => env.limiteAuth.porCorreo;
const loginPorCorreo = crearLimite({ limite: porCorreo, clave: claveCorreo('login'), soloFallidos: true });
const recuperarPorCorreo = crearLimite({ limite: porCorreo, clave: claveCorreo('recuperar') });

// Vacía todos los contadores. Solo lo usan las pruebas, para que cada una empiece de cero.
function reiniciarContadores() {
  almacenes.forEach((store) => store.resetAll());
}

module.exports = { porIp: porIpLimite, loginPorCorreo, recuperarPorCorreo, reiniciarContadores };

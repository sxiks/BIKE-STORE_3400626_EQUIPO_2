// Formatos compartidos por los generadores del informe del tablero (B4.1 · CU-18).
const env = require('../../config/env');

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const fechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: env.db.timezone });
const fechaIso = new Intl.DateTimeFormat('en-CA', { timeZone: env.db.timezone }); // AAAA-MM-DD

const formatoCOP = (valor) => moneda.format(Number(valor) || 0);
const formatoFechaHora = (fecha) => fechaHora.format(fecha);
const fechaArchivo = (fecha) => fechaIso.format(fecha);

// "Del 2026-11-01 al 2026-11-30", "Desde 2026-11-01", "Hasta …" o "Todo el historial".
function textoPeriodo({ desde, hasta }) {
  if (desde && hasta) return `Del ${desde} al ${hasta}`;
  if (desde) return `Desde ${desde}`;
  if (hasta) return `Hasta ${hasta}`;
  return 'Todo el historial';
}

module.exports = { formatoCOP, formatoFechaHora, fechaArchivo, textoPeriodo };

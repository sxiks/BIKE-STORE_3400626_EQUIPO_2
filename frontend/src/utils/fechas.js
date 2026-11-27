// Fechas AAAA-MM-DD en la zona horaria del navegador, para los filtros del tablero y de los pedidos (F4).
// La API interpreta esas fechas como días de Colombia; la tienda opera en Colombia, así que coinciden.

const dosDigitos = (n) => String(n).padStart(2, '0');

export function fechaISO(fecha) {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

// Atajos del tablero: "Este mes" (del día 1 a hoy) y "Últimos 30 días" (hoy incluido).
export function esteMes(hoy = new Date()) {
  return { desde: fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: fechaISO(hoy) };
}

export function ultimos30Dias(hoy = new Date()) {
  return { desde: fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 29)), hasta: fechaISO(hoy) };
}

// "2026-11-05" → "5 nov 2026" (sin pasar por Date, para no correr el día por la zona horaria).
const formateadorDia = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' });
export function formatoDia(iso) {
  return formateadorDia.format(new Date(`${iso}T00:00:00Z`));
}

// Texto del periodo de un filtro: "Del 1 nov 2026 al 27 nov 2026", "Desde …", "Hasta …" o "Todo el historial".
export function textoPeriodo({ desde, hasta } = {}) {
  if (desde && hasta) return `Del ${formatoDia(desde)} al ${formatoDia(hasta)}`;
  if (desde) return `Desde el ${formatoDia(desde)}`;
  if (hasta) return `Hasta el ${formatoDia(hasta)}`;
  return 'Todo el historial';
}

// Un rango es válido si falta alguna de las dos fechas o si "desde" no es posterior a "hasta".
export const rangoValido = ({ desde, hasta } = {}) => !desde || !hasta || desde <= hasta;

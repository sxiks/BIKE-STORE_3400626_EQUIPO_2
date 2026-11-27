import { api, apiArchivo } from './api';

// Tablero del administrador (F4 · CU-16, CU-17, CU-18).
// Contrato: sección "Tablero · admin" de docs/diseno-tecnico/API_CONTRATOS.md.

// Query string con solo los filtros que tienen valor: { desde, hasta, categoria } → "?desde=…".
export function consulta(filtros = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') params.set(clave, String(valor).trim());
  });
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

// GET /dashboard/metricas?desde=&hasta=&categoria= → { filtros, ventas_totales, cantidad_pedidos,
// unidades_vendidas, mas_vendidos: [top 5] } · 400 fecha inválida o desde > hasta
export function obtenerMetricas({ desde, hasta, categoria } = {}) {
  return api(`/dashboard/metricas${consulta({ desde, hasta, categoria })}`);
}

// GET /dashboard/alertas → { umbral_stock_bajo, stock_bajo, agotados, inactivos_en_carritos,
// pedidos_pendientes, pedidos_fallidos }. Es el estado actual: no depende de los filtros.
export function obtenerAlertas() {
  return api('/dashboard/alertas');
}

// GET /dashboard/exportar?formato=xlsx|pdf&… → { blob, nombre } (el archivo lo arma el backend, decisión D11).
export function descargarInforme(formato, { desde, hasta, categoria } = {}) {
  return apiArchivo(`/dashboard/exportar${consulta({ formato, desde, hasta, categoria })}`);
}

// Datos de prueba del tablero (F4.1/F4.2) y de los pedidos del admin (F4 · decisión N), con la forma de la API
// (sección "Tablero · admin" y "GET /pedidos/admin" de API_CONTRATOS.md). Se arman con los productos y los
// pedidos de fixtures/catalogo.js: las pruebas no escriben nombres ni montos a mano.
import { vi } from "vitest";
import { CATEGORIAS, PEDIDOS, PRODUCTOS, errorApi, pedidosSimulado } from "./catalogo";

const activos = PRODUCTOS.filter((p) => p.estado === "activo");

// Top 5 por unidades, como lo ordena la API. `categoria` deja solo los de esa categoría.
export function metricasDe({ categoria = "" } = {}) {
  const lista = activos
    .filter((p) => !categoria || String(p.id_categoria) === String(categoria))
    .slice(0, 6)
    .map((p, i) => ({ id_producto: p.id_producto, nombre: p.nombre, unidades: 6 - i, ventas: p.precio * (6 - i) }));
  const top = lista.slice(0, 5);
  return {
    filtros: { desde: null, hasta: null, categoria: categoria ? Number(categoria) : null },
    ventas_totales: lista.reduce((s, p) => s + p.ventas, 0),
    cantidad_pedidos: lista.length ? 4 : 0,
    unidades_vendidas: lista.reduce((s, p) => s + p.unidades, 0),
    mas_vendidos: top,
  };
}

const UMBRAL = 5;
const resumenPedido = ({ id_pedido, numero_pedido, fecha_pedido }) => ({ id_pedido, numero_pedido, fecha_pedido });
export const ALERTAS = {
  umbral_stock_bajo: UMBRAL,
  stock_bajo: activos.filter((p) => p.existencias > 0 && p.existencias <= UMBRAL).map(({ id_producto, nombre, existencias }) => ({ id_producto, nombre, existencias })),
  agotados: activos.filter((p) => p.existencias === 0).map(({ id_producto, nombre }) => ({ id_producto, nombre })),
  inactivos_en_carritos: PRODUCTOS.filter((p) => p.estado === "inactivo").map(({ id_producto, nombre }) => ({ id_producto, nombre, carritos: 2 })),
  pedidos_pendientes: PEDIDOS.filter((p) => p.estado === "pendiente").map(resumenPedido),
  pedidos_fallidos: PEDIDOS.filter((p) => p.estado === "fallido").map(resumenPedido),
};
export const ALERTAS_VACIAS = {
  umbral_stock_bajo: UMBRAL,
  stock_bajo: [],
  agotados: [],
  inactivos_en_carritos: [],
  pedidos_pendientes: [],
  pedidos_fallidos: [],
};

// Reemplazo de services/dashboard.service.js para vi.mock. descargarInforme responde un blob con el nombre
// que mandaría el servidor en Content-Disposition.
export function tableroSimulado() {
  return {
    consulta: vi.fn(() => ""),
    obtenerMetricas: vi.fn((filtros = {}) => Promise.resolve({ ok: true, data: metricasDe(filtros) })),
    obtenerAlertas: vi.fn(() => Promise.resolve({ ok: true, data: structuredClone(ALERTAS) })),
    descargarInforme: vi.fn((formato) =>
      Promise.resolve({ blob: new Blob(["archivo"]), nombre: `bike-store-informe-2026-11-27.${formato}` })
    ),
  };
}

// ---------- Pedidos del admin ----------

const CLIENTES = [
  { cliente_nombre: "Ana Cliente", cliente_email: "ana@prueba.local" },
  { cliente_nombre: "Luis Pérez", cliente_email: "luis@prueba.local" },
];
/** Lo que respondería GET /pedidos/admin sin filtros: PedidoAdmin = Pedido sin items ni pagos + cliente y unidades. */
export const PEDIDOS_ADMIN = PEDIDOS.map(({ items, pagos, ...resumen }, i) => ({
  ...resumen,
  ...CLIENTES[i % 2],
  unidades: items.reduce((s, it) => s + it.cantidad, 0),
}));

// Filtra como la API: q en número, nombre o correo (contiene, sin mayúsculas); estado; fechas por día.
export function pedidosAdminDe({ q = "", estado = "", desde = "", hasta = "" } = {}) {
  const texto = q.toLowerCase();
  return PEDIDOS_ADMIN.filter(
    (p) =>
      (!texto || [p.numero_pedido, p.cliente_nombre, p.cliente_email].some((v) => v.toLowerCase().includes(texto))) &&
      (!estado || p.estado === estado) &&
      (!desde || p.fecha_pedido.slice(0, 10) >= desde) &&
      (!hasta || p.fecha_pedido.slice(0, 10) <= hasta)
  );
}

// Reemplazo de services/pedidos.service.js con listarPedidosAdmin, además de lo del cliente.
export function pedidosAdminSimulado() {
  return {
    ...pedidosSimulado(),
    listarPedidosAdmin: vi.fn((filtros = {}) => Promise.resolve({ ok: true, data: pedidosAdminDe(filtros) })),
  };
}

export { CATEGORIAS, errorApi };

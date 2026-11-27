// Catálogo de prueba con la forma de la API (contrato "Catálogo y productos") y los datos de la semilla
// (database/migrations/003_datos_semilla.sql). Las pruebas NO deben escribir nombres, precios ni stock a mano:
// los toman de aquí con los selectores de abajo. Si la semilla cambia o crece, basta con actualizar esta lista.
import { vi } from "vitest";

export const CATEGORIAS = [
  { id_categoria: 1, nombre: "Bicicletas de montaña" },
  { id_categoria: 2, nombre: "Bicicletas de ruta" },
  { id_categoria: 3, nombre: "Bicicletas urbanas" },
  { id_categoria: 4, nombre: "Cascos y protección" },
  { id_categoria: 5, nombre: "Accesorios" },
];

const fila = (id_producto, id_categoria, nombre, precio, existencias, estado = "activo") => ({
  id_producto,
  id_categoria,
  categoria: CATEGORIAS.find((c) => c.id_categoria === id_categoria).nombre,
  nombre,
  descripcion: `Descripción de ${nombre}`,
  precio,
  existencias,
  imagen: `${nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`,
  estado,
  disponible: estado === "activo" && existencias > 0,
  created_at: "2026-11-01T12:00:00.000Z",
});

// Todos los productos de la semilla, incluido el inactivo (el catálogo público no lo devuelve).
export const PRODUCTOS = [
  fila(1, 1, "MTB Sierra 29", 2890000, 8),
  fila(2, 1, "MTB Páramo 27.5", 2350000, 3),
  fila(3, 2, "Ruta Velox Carbono", 7950000, 2),
  fila(4, 3, "Urbana Ciudad 700c", 1650000, 12),
  fila(5, 3, "Urbana Plegable 20", 1890000, 0),
  fila(6, 4, "Casco Ruta Aero", 289000, 25),
  fila(7, 4, "Casco MTB Trail", 249000, 18),
  fila(8, 5, "Luces LED recargables", 79000, 40),
  fila(9, 5, "Candado en U reforzado", 95000, 30),
  fila(10, 5, "Bomba de piso", 69000, 20, "inactivo"),
];

// Lo que respondería GET /productos?categoria=&orden= (solo activos; orden por nombre si no se pide otro).
export function catalogoPublico({ categoria = "", orden = "" } = {}) {
  const lista = PRODUCTOS.filter((p) => p.estado === "activo" && (!categoria || String(p.id_categoria) === String(categoria)));
  if (orden === "precio_asc") return lista.sort((a, b) => a.precio - b.precio || a.id_producto - b.id_producto);
  if (orden === "precio_desc") return lista.sort((a, b) => b.precio - a.precio || a.id_producto - b.id_producto);
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// Selectores: describen QUÉ producto necesita cada prueba, no cuál es.
const disponibles = () => catalogoPublico().filter((p) => p.disponible).sort((a, b) => a.id_producto - b.id_producto);
/** Disponibles con al menos `n` unidades, en orden de id. */
export const conStockMinimo = (n) => disponibles().filter((p) => p.existencias >= n);
/** El disponible con menos unidades (pero al menos 2): sirve para llegar al tope de stock. */
export const conPocoStock = () => disponibles().filter((p) => p.existencias >= 2).sort((a, b) => a.existencias - b.existencias)[0];
/** El disponible con más unidades. */
export const conMasStock = () => [...disponibles()].sort((a, b) => b.existencias - a.existencias)[0];
/** Un producto activo sin existencias (el catálogo lo muestra agotado). */
export const agotado = () => catalogoPublico().find((p) => !p.disponible);
/** El que la tienda debe mostrar como destacado: el disponible más caro. */
export const masCaroDisponible = () => [...disponibles()].sort((a, b) => b.precio - a.precio)[0];

// ---------- Administración (F2.3) ----------

// Lo que respondería GET /productos/admin?q=&categoria=&estado= (incluye inactivos; orden por nombre).
// q busca "contiene", sin distinguir mayúsculas, como el backend.
export function catalogoAdmin({ q = "", categoria = "", estado = "" } = {}) {
  const texto = q.trim().toLowerCase();
  return PRODUCTOS.filter(
    (p) =>
      (!texto || p.nombre.toLowerCase().includes(texto)) &&
      (!categoria || String(p.id_categoria) === String(categoria)) &&
      (!estado || p.estado === estado)
  )
    .map((p) => ({ ...p }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Copia del producto con ese id, como lo respondería GET /productos/admin/:id. */
export const productoPorId = (id) => {
  const p = PRODUCTOS.find((x) => x.id_producto === Number(id));
  return p ? { ...p } : null;
};
/** Un producto activo con existencias (para inactivar o editar). */
export const unActivo = () => conMasStock();
/** Un producto inactivo (para activar). */
export const unInactivo = () => PRODUCTOS.find((p) => p.estado === "inactivo");

// Producto que respondería la API después de crear o editar con este FormData.
function desdeFormData(base, datos) {
  const leer = (campo, actual) => (datos.has(campo) ? datos.get(campo) : actual);
  const idCategoria = Number(leer("id_categoria", base.id_categoria));
  const existencias = Number(leer("existencias", base.existencias));
  const estado = base.estado ?? "activo";
  return {
    ...base,
    id_categoria: idCategoria,
    categoria: CATEGORIAS.find((c) => c.id_categoria === idCategoria)?.nombre ?? "",
    nombre: String(leer("nombre", base.nombre)).trim(),
    descripcion: String(leer("descripcion", base.descripcion ?? "")).trim() || null,
    precio: Number(leer("precio", base.precio)),
    existencias,
    imagen: datos.has("imagen") ? "nueva-imagen.png" : base.imagen,
    estado,
    disponible: estado === "activo" && existencias > 0,
  };
}

// Reemplazo de services/productos.service.js para vi.mock:
//   vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());
// Las funciones de administración no guardan nada: responden con lo que devolvería la API.
export function servicioSimulado() {
  return {
    ORDENES: ["precio_asc", "precio_desc"],
    listarCategorias: vi.fn(() => Promise.resolve({ ok: true, data: CATEGORIAS })),
    listarProductos: vi.fn((filtros = {}) => Promise.resolve({ ok: true, data: catalogoPublico(filtros) })),
    listarProductosAdmin: vi.fn((filtros = {}) => Promise.resolve({ ok: true, data: catalogoAdmin(filtros) })),
    obtenerProductoAdmin: vi.fn((id) => Promise.resolve({ ok: true, data: productoPorId(id) })),
    crearProducto: vi.fn((datos) =>
      Promise.resolve({ ok: true, data: desdeFormData({ id_producto: 100, created_at: "2026-11-27T12:00:00.000Z" }, datos) })
    ),
    actualizarProducto: vi.fn((id, datos) => Promise.resolve({ ok: true, data: desdeFormData(productoPorId(id), datos) })),
    cambiarEstadoProducto: vi.fn((id, estado) => {
      const p = productoPorId(id);
      return Promise.resolve({ ok: true, data: { ...p, estado, disponible: estado === "activo" && p.existencias > 0 } });
    }),
  };
}

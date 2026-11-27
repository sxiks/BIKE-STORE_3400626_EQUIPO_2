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

// ---------- Galería y categorías (F2.4 · decisión M) ----------

export const MAX_IMAGENES = 5; // portada + 4
/** El producto que trae galería en el catálogo de prueba (dos imágenes adicionales). */
export const conGaleria = () => unActivo();
const galeriaInicial = () => ({
  [conGaleria().id_producto]: [
    { id_imagen: 1, imagen: "extra-1.png", orden: 1 },
    { id_imagen: 2, imagen: "extra-2.png", orden: 2 },
  ],
});
/** Galería inicial de un producto (copia). */
export const galeriaDe = (id) => (galeriaInicial()[id] ?? []).map((i) => ({ ...i }));

/** Categorías con su número de productos (activos e inactivos), como GET /categorias/admin. */
export const categoriasAdmin = () =>
  CATEGORIAS.map((c) => ({ ...c, total_productos: PRODUCTOS.filter((p) => p.id_categoria === c.id_categoria).length }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
/** Una categoría sin productos no existe en la semilla: las pruebas la crean. Esta sí tiene. */
export const categoriaConProductos = () => categoriasAdmin().find((c) => c.total_productos > 0);

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

// Error con la forma de ApiError (sin importar services/api.js, para no cargar la app en el fixture).
function errorApi(message, status, code, data) {
  return Object.assign(new Error(message), { name: "ApiError", status, code: code ?? null, data: data ?? null });
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
    crearProducto: vi.fn((datos) =>
      Promise.resolve({ ok: true, data: desdeFormData({ id_producto: 100, created_at: "2026-11-27T12:00:00.000Z" }, datos) })
    ),
    actualizarProducto: vi.fn((id, datos) => Promise.resolve({ ok: true, data: desdeFormData(productoPorId(id), datos) })),
    cambiarEstadoProducto: vi.fn((id, estado) => {
      const p = productoPorId(id);
      return Promise.resolve({ ok: true, data: { ...p, estado, disponible: estado === "activo" && p.existencias > 0 } });
    }),
    ...galeriaSimulada(),
  };
}

// Detalle, eliminar y galería (F2.4). Guarda estado mientras dure el servicio simulado (una prueba),
// para que varias acciones seguidas se comporten como en la API.
function galeriaSimulada() {
  const galerias = galeriaInicial();
  const portadas = {};
  let siguienteId = 100;

  const detalle = (id) => {
    const p = productoPorId(id);
    if (!p) return null;
    return { ...p, imagen: portadas[p.id_producto] ?? p.imagen, imagenes: (galerias[p.id_producto] ?? []).map((i) => ({ ...i })) };
  };
  const responder = (id) => {
    const d = detalle(id);
    return d ? Promise.resolve({ ok: true, data: d }) : Promise.reject(errorApi("Producto no encontrado", 404));
  };
  const imagenDe = (id, idImagen) => (galerias[Number(id)] ?? []).find((i) => i.id_imagen === Number(idImagen));

  return {
    obtenerProducto: vi.fn((id) => {
      const d = detalle(id);
      return d && d.estado === "activo" ? Promise.resolve({ ok: true, data: d }) : Promise.reject(errorApi("Producto no encontrado", 404));
    }),
    obtenerProductoAdmin: vi.fn((id) => responder(id)),
    eliminarProducto: vi.fn((id) => Promise.resolve({ ok: true, data: { id_producto: Number(id) } })),
    agregarImagen: vi.fn((id, archivo) => {
      const lista = (galerias[Number(id)] ??= []);
      if (lista.length + 1 >= MAX_IMAGENES) {
        return Promise.reject(errorApi("El producto ya tiene el máximo de 5 imágenes", 409, "LIMITE_IMAGENES", { maximo: MAX_IMAGENES }));
      }
      lista.push({ id_imagen: siguienteId++, imagen: archivo?.name ?? "nueva.png", orden: lista.length + 1 });
      return responder(id);
    }),
    quitarImagen: vi.fn((id, idImagen) => {
      if (!imagenDe(id, idImagen)) return Promise.reject(errorApi("Imagen no encontrada", 404));
      galerias[Number(id)] = galerias[Number(id)].filter((i) => i.id_imagen !== Number(idImagen));
      return responder(id);
    }),
    elegirPortada: vi.fn((id, idImagen) => {
      const img = imagenDe(id, idImagen);
      if (!img) return Promise.reject(errorApi("Imagen no encontrada", 404));
      const anterior = detalle(id).imagen;
      portadas[Number(id)] = img.imagen;
      img.imagen = anterior;
      return responder(id);
    }),
    reordenarImagenes: vi.fn((id, ids) => {
      const lista = galerias[Number(id)] ?? [];
      galerias[Number(id)] = ids.map((x, i) => ({ ...lista.find((img) => img.id_imagen === x), orden: i + 1 }));
      return responder(id);
    }),
  };
}

// Reemplazo de services/categorias.service.js para vi.mock:
//   vi.mock("../services/categorias.service", async () => (await import("./fixtures/catalogo")).categoriasSimulado());
// Guarda estado mientras dure el servicio simulado. Aplica las reglas del backend: nombre único sin
// distinguir mayúsculas y no eliminar una categoría con productos.
export function categoriasSimulado() {
  let lista = categoriasAdmin();
  let siguienteId = 50;
  const ordenar = () => lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const repetido = (nombre, id) => lista.some((c) => c.nombre.toLowerCase() === nombre.trim().toLowerCase() && c.id_categoria !== id);
  const duplicada = () => Promise.reject(errorApi("Ya existe una categoría con ese nombre", 409, "CATEGORIA_DUPLICADA"));

  return {
    listarCategoriasAdmin: vi.fn(() => Promise.resolve({ ok: true, data: lista.map((c) => ({ ...c })) })),
    crearCategoria: vi.fn((nombre) => {
      if (repetido(nombre)) return duplicada();
      const nueva = { id_categoria: siguienteId++, nombre: nombre.trim(), total_productos: 0 };
      lista.push(nueva);
      ordenar();
      return Promise.resolve({ ok: true, data: { ...nueva } });
    }),
    renombrarCategoria: vi.fn((id, nombre) => {
      const c = lista.find((x) => x.id_categoria === Number(id));
      if (!c) return Promise.reject(errorApi("Categoría no encontrada", 404));
      if (repetido(nombre, c.id_categoria)) return duplicada();
      c.nombre = nombre.trim();
      ordenar();
      return Promise.resolve({ ok: true, data: { ...c } });
    }),
    eliminarCategoria: vi.fn((id) => {
      const c = lista.find((x) => x.id_categoria === Number(id));
      if (!c) return Promise.reject(errorApi("Categoría no encontrada", 404));
      if (c.total_productos > 0) {
        return Promise.reject(
          errorApi(`No se puede eliminar: la categoría tiene ${c.total_productos} productos.`, 409, "CATEGORIA_CON_PRODUCTOS", {
            total_productos: c.total_productos,
          })
        );
      }
      lista = lista.filter((x) => x.id_categoria !== c.id_categoria);
      return Promise.resolve({ ok: true, data: { id_categoria: c.id_categoria } });
    }),
  };
}

// ---------- Carrito del cliente en la API (F3.1) ----------

// Reemplazo de services/carrito.service.js para vi.mock:
//   vi.mock("../services/carrito.service", async () => (await import("./fixtures/catalogo")).carritoSimulado());
// Guarda estado mientras dure el servicio simulado y aplica las reglas del backend (API_CONTRATOS.md, "Carrito"):
// R2 (sumar), STOCK_MAXIMO, SIN_STOCK, PRODUCTO_INACTIVO, CANTIDAD_MINIMA, 404 y los motivos de disponibilidad.
//   inicial: [[producto, cantidad], ...] → el cliente ya tiene ese carrito guardado en la API.
// Además de las funciones del servicio, devuelve `cambiarProducto(id, { existencias, estado, precio })`
// para simular que el admin cambió un producto, y `cantidades()` para ver qué hay guardado.
export function carritoSimulado({ inicial = [] } = {}) {
  const lineas = new Map(inicial.map(([p, cantidad]) => [p.id_producto, cantidad]));
  const cambios = {};
  let idPedido = inicial.length ? 500 : null;

  const producto = (id) => {
    const p = productoPorId(id);
    return p ? { ...p, ...cambios[p.id_producto] } : null;
  };
  const armar = () => {
    const items = [...lineas].map(([id, cantidad]) => {
      const p = producto(id);
      const motivo =
        p.estado !== "activo" ? "INACTIVO" : p.existencias === 0 ? "SIN_STOCK" : cantidad > p.existencias ? "SUPERA_STOCK" : null;
      return {
        id_producto: id,
        nombre: p.nombre,
        imagen: p.imagen,
        precio: p.precio,
        existencias: p.existencias,
        estado: p.estado,
        cantidad,
        subtotal: p.precio * cantidad,
        disponible: motivo === null,
        motivo,
      };
    });
    return Promise.resolve({
      ok: true,
      data: {
        id_pedido: idPedido,
        items,
        total_unidades: items.reduce((s, i) => s + i.cantidad, 0),
        total: items.reduce((s, i) => s + i.subtotal, 0),
        puede_comprar: items.length > 0 && items.every((i) => i.disponible),
      },
    });
  };
  const comprable = (id) => {
    const p = producto(id);
    if (!p) return errorApi("Producto no encontrado", 404);
    if (p.estado !== "activo") return errorApi("El producto no está disponible", 400, "PRODUCTO_INACTIVO");
    if (p.existencias === 0) return errorApi("El producto está agotado", 400, "SIN_STOCK");
    return null;
  };
  const MAX = "Este es el máximo de producto disponible en stock";

  return {
    obtenerCarrito: vi.fn(() => armar()),
    agregarAlCarrito: vi.fn((id, cantidad = 1) => {
      const error = comprable(id);
      if (error) return Promise.reject(error);
      const actual = lineas.get(id) ?? 0;
      const { existencias } = producto(id);
      if (actual + cantidad > existencias) {
        return Promise.reject(errorApi(MAX, 400, "STOCK_MAXIMO", { maximo: existencias, en_carrito: actual }));
      }
      lineas.set(id, actual + cantidad);
      idPedido ??= 500;
      return armar();
    }),
    cambiarCantidadCarrito: vi.fn((id, cantidad) => {
      if (cantidad === 0) return Promise.reject(errorApi("Esta es la cantidad mínima (1).", 400, "CANTIDAD_MINIMA"));
      const error = comprable(id);
      if (error) return Promise.reject(error);
      if (cantidad > producto(id).existencias) {
        return Promise.reject(errorApi(MAX, 400, "STOCK_MAXIMO", { maximo: producto(id).existencias }));
      }
      if (!lineas.has(id)) return Promise.reject(errorApi("El producto no está en el carrito", 404));
      lineas.set(id, cantidad);
      return armar();
    }),
    quitarDelCarrito: vi.fn((id) => {
      if (!lineas.has(id)) return Promise.reject(errorApi("El producto no está en el carrito", 404));
      lineas.delete(id);
      return armar();
    }),
    cambiarProducto: (id, campos) => {
      cambios[id] = { ...cambios[id], ...campos };
    },
    cantidades: () => Object.fromEntries(lineas),
  };
}

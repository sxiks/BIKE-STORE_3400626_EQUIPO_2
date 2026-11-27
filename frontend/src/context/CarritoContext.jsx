import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "./ToastContext";

export const MSG_MAX = "Este es el máximo de producto disponible en stock";
const CLAVE_STORAGE = "bikestore_carrito";
const CLAVE_ANTIGUA = "tienda-palmira-carrito"; // carrito de los datos simulados (antes de F2.2)

// Carrito LOCAL (en el navegador) hasta F3.1, que lo conecta a la API.
// Desde F2.2 los productos vienen de la API y la lista visible puede estar filtrada por categoría,
// así que cada línea guarda una copia del producto (id, nombre, precio, stock) al agregarlo.
// Cuando llega el catálogo, `sincronizarProductos` actualiza precio y stock de las líneas que estén en él.

// Producto de la API → datos que necesita el carrito.
export const aLinea = (p) => ({ id: p.id_producto, nombre: p.nombre, precio: p.precio, stock: p.existencias });

// Lee el carrito guardado y descarta datos inválidos.
function cargarCarrito() {
  try {
    localStorage.removeItem(CLAVE_ANTIGUA);
    const crudo = JSON.parse(localStorage.getItem(CLAVE_STORAGE) ?? "[]");
    if (!Array.isArray(crudo)) return [];
    return crudo.filter(
      (i) =>
        Number.isInteger(i?.id) &&
        typeof i.nombre === "string" &&
        typeof i.precio === "number" &&
        Number.isInteger(i.stock) &&
        Number.isInteger(i.cantidad) &&
        i.cantidad >= 1
    ).map((i) => ({ ...i, cantidad: Math.min(i.cantidad, i.stock) })).filter((i) => i.cantidad >= 1);
  } catch {
    return [];
  }
}

const CarritoContext = createContext(null);

export function CarritoProvider({ children }) {
  const { mostrar } = useToast();
  const [items, setItems] = useState(cargarCarrito); // [{ id, nombre, precio, stock, cantidad }]

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [items]);

  const itemDe = (id) => items.find((i) => i.id === id);
  const cantidadDe = (id) => itemDe(id)?.cantidad ?? 0;

  // Unidades que aún se pueden agregar de un producto de la API.
  const disponible = (producto) => producto.existencias - cantidadDe(producto.id_producto);

  // Corrige al stock máximo y avisa con toast. Devuelve la cantidad aplicada.
  const limitar = (stock, n) => {
    if (n > stock) {
      mostrar(MSG_MAX);
      return stock;
    }
    return n;
  };
  const limitarAStock = (producto, n) => limitar(producto.existencias, n);

  // Suma a la línea existente (nunca duplica líneas). `producto` es el de la API.
  const agregar = (producto, cantidad) => {
    const linea = aLinea(producto);
    const nueva = limitar(linea.stock, cantidadDe(linea.id) + cantidad);
    setItems((prev) =>
      prev.some((i) => i.id === linea.id)
        ? prev.map((i) => (i.id === linea.id ? { ...i, ...linea, cantidad: nueva } : i))
        : [...prev, { ...linea, cantidad: nueva }]
    );
  };

  const fijarCantidad = (id, n) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad: n } : i)));

  const cambiarCantidad = (id, n) => {
    const aplicada = limitar(itemDe(id).stock, n);
    fijarCantidad(id, aplicada);
    return aplicada;
  };

  const eliminar = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const avisarMinimo = (id) =>
    mostrar(`Esta es la cantidad mínima (1). ¿Deseas eliminar «${itemDe(id).nombre}» del carrito?`, {
      accion: { etiqueta: "Sí, eliminar", onClick: () => eliminar(id) },
      duracion: 8000,
    });

  const aumentar = (id) => cambiarCantidad(id, cantidadDe(id) + 1);
  const disminuir = (id) => (cantidadDe(id) <= 1 ? avisarMinimo(id) : cambiarCantidad(id, cantidadDe(id) - 1));

  // Actualiza precio y stock con los datos recién traídos de la API. Si el stock bajó, la cantidad se ajusta.
  const sincronizarProductos = useCallback((productos) => {
    const porId = new Map(productos.map((p) => [p.id_producto, aLinea(p)]));
    setItems((prev) => {
      let cambio = false;
      const siguiente = prev
        .map((i) => {
          const fresco = porId.get(i.id);
          if (!fresco) return i;
          const cantidad = Math.min(i.cantidad, fresco.stock);
          if (fresco.precio === i.precio && fresco.stock === i.stock && fresco.nombre === i.nombre && cantidad === i.cantidad) {
            return i;
          }
          cambio = true;
          return { ...i, ...fresco, cantidad };
        })
        .filter((i) => i.cantidad >= 1);
      return cambio || siguiente.length !== prev.length ? siguiente : prev;
    });
  }, []);

  const lineas = useMemo(() => items.map((i) => ({ ...i, subtotal: i.precio * i.cantidad })), [items]);
  const totalUnidades = lineas.reduce((s, l) => s + l.cantidad, 0);
  const totalCompra = lineas.reduce((s, l) => s + l.subtotal, 0);

  const valor = {
    lineas,
    totalUnidades,
    totalCompra,
    disponible,
    limitarAStock,
    agregar,
    cambiarCantidad,
    aumentar,
    disminuir,
    avisarMinimo,
    eliminar,
    sincronizarProductos,
  };

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return ctx;
}

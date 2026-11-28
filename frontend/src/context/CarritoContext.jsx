import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useToast } from "./ToastContext";
import { useAuth } from "../hooks/useAuth";
import {
  agregarAlCarrito,
  cambiarCantidadCarrito,
  obtenerCarrito,
  quitarDelCarrito,
} from "../services/carrito.service";

export const MSG_MAX = "Este es el máximo de producto disponible en stock";
const CLAVE_STORAGE = "bikestore_carrito";
const CLAVE_ANTIGUA = "tienda-palmira-carrito"; // carrito de los datos simulados (antes de F2.2)

// Carrito de la tienda (F3.1, decisión D1 ajustada). Dos modos detrás de la misma interfaz:
//   · visitante (sin sesión, o sesión que no es de cliente): el carrito vive en el navegador (localStorage);
//   · cliente: el carrito vive en la API (es su pedido en estado 'carrito', D12). Totales, unidades y
//     puede_comprar los calcula el backend; aquí no se recalculan.
// Al iniciar sesión un cliente, lo que tenía en el navegador se pasa a su carrito de la API (se suma, R2,
// sin superar el stock) y el navegador queda vacío. Comprar exige sesión de cliente (ruta /checkout protegida).
// El proveedor va en App.jsx, dentro de AuthProvider: un solo carrito para toda la app.

// Producto de la API → línea del carrito del navegador.
export const aLinea = (p) => ({ id: p.id_producto, nombre: p.nombre, precio: p.precio, stock: p.existencias });

// Lee el carrito del navegador y descarta datos inválidos.
function cargarLocal() {
  try {
    localStorage.removeItem(CLAVE_ANTIGUA);
    const crudo = JSON.parse(localStorage.getItem(CLAVE_STORAGE) ?? "[]");
    if (!Array.isArray(crudo)) return [];
    return crudo
      .filter(
        (i) =>
          Number.isInteger(i?.id) &&
          typeof i.nombre === "string" &&
          typeof i.precio === "number" &&
          Number.isInteger(i.stock) &&
          Number.isInteger(i.cantidad) &&
          i.cantidad >= 1
      )
      .map((i) => ({ ...i, cantidad: Math.min(i.cantidad, i.stock) }))
      .filter((i) => i.cantidad >= 1);
  } catch {
    return [];
  }
}

function guardarLocal(items) {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
  } catch {
    /* almacenamiento no disponible */
  }
}

// Las dos fuentes se muestran con la misma forma:
// { lineas: [{ id, nombre, imagen, precio, stock, cantidad, subtotal, disponible, motivo }], totalUnidades, totalCompra, puedeComprar }
function desdeLocal(items) {
  const lineas = items.map((i) => ({ ...i, subtotal: i.precio * i.cantidad, disponible: true, motivo: null }));
  return {
    lineas,
    totalUnidades: lineas.reduce((s, l) => s + l.cantidad, 0),
    totalCompra: lineas.reduce((s, l) => s + l.subtotal, 0),
    puedeComprar: lineas.length > 0,
  };
}

const VACIO = { lineas: [], totalUnidades: 0, totalCompra: 0, puedeComprar: false };

// Carrito del contrato (API_CONTRATOS.md) → forma común. Tolera respuestas sin `items`.
function desdeApi(carrito) {
  const items = Array.isArray(carrito?.items) ? carrito.items : [];
  return {
    lineas: items.map((i) => ({
      id: i.id_producto,
      nombre: i.nombre,
      imagen: i.imagen,
      precio: i.precio,
      stock: i.existencias,
      cantidad: i.cantidad,
      subtotal: i.subtotal,
      disponible: i.disponible !== false,
      motivo: i.motivo ?? null,
    })),
    totalUnidades: carrito?.total_unidades ?? 0,
    totalCompra: carrito?.total ?? 0,
    puedeComprar: Boolean(carrito?.puede_comprar),
  };
}

// Rechazos de la API que dependen del producto, no de la conexión: la línea no se pasa (H-01).
const RECHAZOS_DE_NEGOCIO = ["PRODUCTO_INACTIVO", "SIN_STOCK", "STOCK_MAXIMO"];

// Pone la línea que falló en `descartados` (regla de negocio o producto inexistente) o en `conservados`.
function clasificar(error, linea, resultado) {
  if (RECHAZOS_DE_NEGOCIO.includes(error.code) || error.status === 404) {
    resultado.descartados.push(linea.nombre);
  } else {
    resultado.conservados.push(linea);
    resultado.error ??= error;
  }
}

// Envía cada línea del navegador a la API y clasifica el resultado (ver el efecto del proveedor).
async function pasarAlCarrito(lineas) {
  const resultado = { conservados: [], incompletos: [], descartados: [], error: null };
  for (const linea of lineas) {
    try {
      await agregarAlCarrito(linea.id, linea.cantidad);
    } catch (error) {
      if (error.code === "STOCK_MAXIMO") {
        // Ya tenía unidades en su carrito y no caben todas: se agregan las que quedan libres.
        const libres = error.data.maximo - error.data.en_carrito;
        try {
          if (libres > 0) await agregarAlCarrito(linea.id, libres);
          resultado.incompletos.push(linea.nombre);
        } catch (otro) {
          clasificar(otro, { ...linea, cantidad: libres }, resultado);
        }
      } else {
        clasificar(error, linea, resultado);
      }
    }
  }
  return resultado;
}

// Avisa con toasts cómo terminó el paso del carrito del navegador a la cuenta.
function avisarPaso(mostrar, { conservados, incompletos, descartados, error }, total) {
  if (conservados.length) {
    mostrar(
      `${error.message} No pudimos pasar a tu cuenta: ${conservados.map((l) => l.nombre).join(", ")}. ` +
        "Siguen guardados en este navegador y se pasarán la próxima vez que entres."
    );
  }
  if (descartados.length) {
    mostrar(`Estos productos ya no están disponibles y no se pasaron a tu cuenta: ${descartados.join(", ")}.`);
  }
  if (incompletos.length) {
    mostrar(`Pasamos tu carrito a tu cuenta, pero no cabían todas las unidades de: ${incompletos.join(", ")}.`);
  }
  if (total && !conservados.length && !descartados.length && !incompletos.length) {
    mostrar("Pasamos a tu cuenta los productos que agregaste antes de iniciar sesión.");
  }
}

const CarritoContext = createContext(null);

export function CarritoProvider({ children }) {
  const { mostrar } = useToast();
  const { user, verificando } = useAuth();
  const esCliente = !verificando && user?.rol === "cliente";

  const [local, setLocal] = useState(cargarLocal); // modo visitante: [{ id, nombre, precio, stock, cantidad }]
  const [remoto, setRemoto] = useState(null); // modo cliente: forma común, o null mientras carga
  const cola = useRef(Promise.resolve());

  useEffect(() => {
    guardarLocal(local);
  }, [local]);

  // Las peticiones al carrito van una detrás de otra: un doble clic nunca manda dos que se crucen.
  const enCola = useCallback((tarea) => {
    const resultado = cola.current.then(tarea, tarea);
    cola.current = resultado.catch(() => {});
    return resultado;
  }, []);

  const refrescar = useCallback(
    () =>
      enCola(() => obtenerCarrito())
        .then(({ data }) => setRemoto(desdeApi(data)))
        .catch(() => {}),
    [enCola]
  );

  // Al entrar como cliente: pasar el carrito del navegador a la API y cargar el carrito de la API.
  // El navegador se vacía ANTES de enviar: si el efecto corre dos veces (StrictMode), nada se envía dos veces.
  // Cada línea se resuelve por separado (auditoría, H-01):
  //   · llegó a la API → sale del navegador;
  //   · la API la rechaza por una regla de negocio (inactivo, agotado, no existe, sin cupo) → no se pasa y se avisa;
  //   · falla por otra causa (sin conexión, error del servidor, sesión) → VUELVE al navegador y se intenta
  //     la próxima vez que el cliente entre. Así nunca se pierde un producto ni se envía dos veces.
  const idUsuario = user?.id_usuario;
  useEffect(() => {
    if (!esCliente) {
      setRemoto(null);
      return undefined;
    }
    let cancelado = false;
    const pendientes = cargarLocal();
    if (pendientes.length) {
      guardarLocal([]);
      setLocal([]);
    }

    let avisado = false; // sin conexión, el aviso del paso ya lo explicó: no se repite el error al cargar
    enCola(async () => {
      const resultado = await pasarAlCarrito(pendientes);
      // Lo que no se pudo pasar vuelve al navegador, aunque el efecto ya se haya cancelado: es del visitante.
      if (resultado.conservados.length) {
        guardarLocal(resultado.conservados);
        setLocal(resultado.conservados);
      }
      avisarPaso(mostrar, resultado, pendientes.length);
      avisado = resultado.conservados.length > 0;
      const { data } = await obtenerCarrito();
      if (!cancelado) setRemoto(desdeApi(data));
    }).catch((error) => {
      if (cancelado) return;
      setRemoto(VACIO);
      if (!avisado) mostrar(error.message);
    });

    return () => {
      cancelado = true;
    };
  }, [esCliente, idUsuario, enCola, mostrar]);

  const estado = esCliente ? (remoto ?? VACIO) : desdeLocal(local);
  const lineaDe = (id) => estado.lineas.find((l) => l.id === id);
  const cantidadDe = (id) => lineaDe(id)?.cantidad ?? 0;

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

  // ---------- Modo cliente: cada operación va a la API y el carrito se reemplaza con su respuesta ----------

  // Errores por `code` (API_CONTRATOS.md). Después se vuelve a pedir el carrito para mostrar el estado real.
  function manejarError(error, id) {
    if (error.code === "STOCK_MAXIMO") mostrar(MSG_MAX);
    else if (error.code === "CANTIDAD_MINIMA") avisarMinimo(id);
    else mostrar(error.message);
    refrescar();
  }

  function enviar(tarea, id) {
    return enCola(tarea)
      .then(({ data }) => setRemoto(desdeApi(data)))
      .catch((error) => manejarError(error, id));
  }

  // Muestra el cambio de cantidad de inmediato (la respuesta de la API lo confirma o lo corrige).
  function ajustarRemoto(id, cambio) {
    setRemoto((prev) => {
      if (!prev) return prev;
      const lineas = prev.lineas
        .map((l) => (l.id === id ? cambio(l) : l))
        .filter(Boolean)
        .map((l) => ({ ...l, subtotal: l.precio * l.cantidad }));
      return { ...prev, lineas, totalUnidades: lineas.reduce((s, l) => s + l.cantidad, 0), totalCompra: lineas.reduce((s, l) => s + l.subtotal, 0) };
    });
  }

  // ---------- Operaciones (mismas funciones en los dos modos) ----------

  // Suma a la línea existente (nunca duplica líneas). `producto` es el de la API.
  const agregar = (producto, cantidad) => {
    const id = producto.id_producto;
    const enCarrito = cantidadDe(id);
    const n = limitar(producto.existencias, enCarrito + cantidad) - enCarrito;
    if (n <= 0) return;
    if (esCliente) {
      enviar(() => agregarAlCarrito(id, n), id);
      return;
    }
    const linea = aLinea(producto);
    setLocal((prev) =>
      prev.some((i) => i.id === id)
        ? prev.map((i) => (i.id === id ? { ...i, ...linea, cantidad: i.cantidad + n } : i))
        : [...prev, { ...linea, cantidad: n }]
    );
  };

  const cambiarCantidad = (id, n) => {
    const linea = lineaDe(id);
    if (!linea) return n;
    const aplicada = limitar(linea.stock, n);
    if (esCliente) {
      if (aplicada !== linea.cantidad) {
        ajustarRemoto(id, (l) => ({ ...l, cantidad: aplicada }));
        enviar(() => cambiarCantidadCarrito(id, aplicada), id);
      }
    } else {
      setLocal((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad: aplicada } : i)));
    }
    return aplicada;
  };

  const eliminar = (id) => {
    if (esCliente) {
      ajustarRemoto(id, () => null);
      enviar(() => quitarDelCarrito(id), id);
    } else {
      setLocal((prev) => prev.filter((i) => i.id !== id));
    }
  };

  function avisarMinimo(id) {
    const nombre = lineaDe(id)?.nombre ?? "el producto";
    mostrar(`Esta es la cantidad mínima (1). ¿Deseas eliminar «${nombre}» del carrito?`, {
      accion: { etiqueta: "Sí, eliminar", onClick: () => eliminar(id) },
      duracion: 8000,
    });
  }

  const aumentar = (id) => cambiarCantidad(id, cantidadDe(id) + 1);
  const disminuir = (id) => (cantidadDe(id) <= 1 ? avisarMinimo(id) : cambiarCantidad(id, cantidadDe(id) - 1));

  // Modo visitante: actualiza precio y stock de las líneas con los datos recién traídos de la API.
  // En modo cliente no hace falta: cada respuesta del carrito ya trae el precio y el stock actuales.
  const sincronizarProductos = useCallback((productos) => {
    const porId = new Map(productos.map((p) => [p.id_producto, aLinea(p)]));
    setLocal((prev) => {
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

  const valor = {
    modo: esCliente ? "cliente" : "visitante",
    cargando: esCliente && remoto === null,
    lineas: estado.lineas,
    totalUnidades: estado.totalUnidades,
    totalCompra: estado.totalCompra,
    puedeComprar: estado.puedeComprar,
    disponible,
    limitarAStock,
    agregar,
    cambiarCantidad,
    aumentar,
    disminuir,
    avisarMinimo,
    eliminar,
    sincronizarProductos,
    refrescar,
  };

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return ctx;
}

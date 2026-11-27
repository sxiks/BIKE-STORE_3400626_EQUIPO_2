import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCarrito } from "../context/CarritoContext";
import { formatoCOP } from "../utils/formato";
import CantidadInput from "./CantidadInput";

// Texto de cada motivo por el que un ítem no se puede comprar (D4, CU-06). Solo llegan en modo cliente:
// el backend los calcula con el estado y el stock actuales del producto.
function textoMotivo(linea) {
  if (linea.motivo === "INACTIVO") return "Ya no está disponible. Quítalo para poder comprar.";
  if (linea.motivo === "SIN_STOCK") return "Agotado. Quítalo para poder comprar.";
  if (linea.motivo === "SUPERA_STOCK")
    return `Solo ${linea.stock === 1 ? "queda 1 unidad" : `quedan ${linea.stock} unidades`}. Baja la cantidad para poder comprar.`;
  return null;
}

// Panel lateral del carrito. F3.1: muestra el carrito de la API (cliente) o del navegador (visitante),
// los ítems no disponibles con su motivo y el botón "Comprar", que lleva a /checkout (pide sesión de cliente).
export default function CarritoPanel({ abierto, onCerrar }) {
  const {
    modo,
    cargando,
    lineas,
    totalUnidades,
    totalCompra,
    puedeComprar,
    cambiarCantidad,
    aumentar,
    disminuir,
    avisarMinimo,
    eliminar,
  } = useCarrito();
  const botonCerrar = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    botonCerrar.current?.focus();
    const alTeclear = (e) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const noDisponibles = lineas.filter((l) => !l.disponible).length;

  return (
    <>
      <div className="carrito__fondo" onClick={onCerrar} aria-hidden="true" />
      <aside className="carrito" role="dialog" aria-modal="true" aria-labelledby="titulo-carrito">
        <div className="carrito__cabecera">
          <h2 id="titulo-carrito">Tu carrito</h2>
          <button ref={botonCerrar} type="button" className="icono-btn" aria-label="Cerrar carrito" onClick={onCerrar}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {cargando ? (
          <p className="carrito__vacio" role="status">
            Cargando tu carrito…
          </p>
        ) : lineas.length === 0 ? (
          <p className="carrito__vacio">Tu carrito está vacío.</p>
        ) : (
          <>
            {noDisponibles > 0 && (
              <p className="alerta alerta--aviso carrito__aviso" role="alert">
                <AlertTriangle size={18} aria-hidden="true" />
                {noDisponibles === 1
                  ? "Un producto de tu carrito no se puede comprar. Revísalo para continuar."
                  : `${noDisponibles} productos de tu carrito no se pueden comprar. Revísalos para continuar.`}
              </p>
            )}
            <ul className="carrito__lineas">
              {lineas.map((l) => {
                const motivo = textoMotivo(l);
                // Inactivo o agotado: solo se puede quitar. Supera el stock: se puede bajar la cantidad.
                const bloqueada = l.motivo === "INACTIVO" || l.motivo === "SIN_STOCK";
                const idMotivo = `motivo-${l.id}`;
                return (
                  <li
                    key={l.id}
                    className={`carrito__linea${l.disponible ? "" : " carrito__linea--no-disponible"}`}
                    data-testid={`linea-${l.id}`}
                  >
                    <div className="carrito__info">
                      <strong>{l.nombre}</strong>
                      <span>{formatoCOP(l.precio)} c/u</span>
                    </div>
                    {motivo && (
                      <p className="carrito__motivo" id={idMotivo}>
                        {motivo}
                      </p>
                    )}
                    <div className="carrito__controles">
                      <button
                        type="button"
                        className="icono-btn"
                        aria-label={`Disminuir cantidad de ${l.nombre}`}
                        disabled={bloqueada}
                        onClick={() => disminuir(l.id)}
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <CantidadInput
                        value={l.cantidad}
                        max={Math.max(l.stock, 1)}
                        label={`Cantidad en el carrito de ${l.nombre}`}
                        disabled={bloqueada}
                        onChange={(n) => cambiarCantidad(l.id, n)}
                        onMinimo={() => avisarMinimo(l.id)}
                      />
                      <button
                        type="button"
                        className="icono-btn"
                        aria-label={`Aumentar cantidad de ${l.nombre}`}
                        disabled={bloqueada || l.motivo === "SUPERA_STOCK"}
                        onClick={() => aumentar(l.id)}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icono-btn icono-btn--peligro"
                        aria-label={`Quitar ${l.nombre} del carrito`}
                        aria-describedby={motivo ? idMotivo : undefined}
                        onClick={() => eliminar(l.id)}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </div>
                    <p className="carrito__subtotal">
                      Subtotal: <strong data-testid={`subtotal-${l.id}`}>{formatoCOP(l.subtotal)}</strong>
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <dl className="carrito__totales">
          <div>
            <dt>Total de unidades</dt>
            <dd data-testid="total-unidades">{totalUnidades}</dd>
          </div>
          <div className="carrito__total-compra">
            <dt>Total de la compra</dt>
            <dd data-testid="total-compra">{formatoCOP(totalCompra)}</dd>
          </div>
        </dl>

        {/* /checkout es solo para clientes: a un visitante la ruta lo lleva a iniciar sesión y luego vuelve. */}
        <div className="carrito__comprar">
          {puedeComprar ? (
            <Link to="/checkout" className="btn btn--primario btn--bloque" onClick={onCerrar}>
              <ShoppingBag size={18} aria-hidden="true" />
              Comprar
            </Link>
          ) : (
            <button type="button" className="btn btn--primario btn--bloque" disabled aria-describedby="carrito-comprar-nota">
              <ShoppingBag size={18} aria-hidden="true" />
              Comprar
            </button>
          )}
          {!puedeComprar && !cargando && (
            <p className="carrito__nota" id="carrito-comprar-nota">
              {lineas.length === 0 ? "Agrega productos para poder comprar." : "Quita o ajusta los productos marcados para poder comprar."}
            </p>
          )}
          {puedeComprar && modo === "visitante" && (
            <p className="carrito__nota">Para comprar te pediremos iniciar sesión; tu carrito pasa a tu cuenta.</p>
          )}
        </div>
      </aside>
    </>
  );
}

import { useState } from "react";
import { Bike } from "lucide-react";
import { useCarrito } from "../context/CarritoContext";
import { useToast } from "../context/ToastContext";
import { formatoCOP } from "../utils/formato";
import CantidadInput from "./CantidadInput";

export default function ProductCard({ producto }) {
  const { agregar, disponible, limitarAStock } = useCarrito();
  const { mostrar } = useToast();
  const [cantidad, setCantidad] = useState(1);
  const libres = disponible(producto.id);

  const alCambiar = (n) => {
    const aplicada = limitarAStock(producto.id, n);
    setCantidad(aplicada);
    return aplicada;
  };

  const alAgregar = () => {
    agregar(producto.id, cantidad);
    setCantidad(1);
  };

  return (
    <article className="producto tarjeta" data-testid={`producto-${producto.id}`}>
      {/* Imagen de reemplazo (decisión L): la foto real llega con el catálogo de la API (F2.2) */}
      <div className="producto__imagen" aria-hidden="true">
        <Bike size={64} strokeWidth={1.5} />
      </div>
      <div className="producto__cuerpo">
        <h3 className="producto__nombre">{producto.nombre}</h3>
        <p className="producto__precio">{formatoCOP(producto.precio)}</p>
        <p className={`producto__stock${libres === 0 ? " producto__stock--agotado" : ""}`}>
          {libres === 0 ? "Sin unidades disponibles" : `Stock disponible: ${libres}`}
        </p>
        <div className="producto__acciones">
          <CantidadInput
            value={cantidad}
            max={producto.stock}
            label={`Cantidad a agregar de ${producto.nombre}`}
            onChange={alCambiar}
            onMinimo={() => mostrar("La cantidad mínima es 1.")}
          />
          <button
            type="button"
            className="btn btn--primario"
            disabled={libres <= 0}
            aria-label={`Agregar ${producto.nombre} al carrito`}
            onClick={alAgregar}
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}

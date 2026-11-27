import { useState } from "react";
import { Link } from "react-router-dom";
import { useCarrito } from "../context/CarritoContext";
import { useToast } from "../context/ToastContext";
import { formatoCOP } from "../utils/formato";
import CantidadInput from "./CantidadInput";
import ImagenProducto from "./ImagenProducto";

// Tarjeta de un producto del catálogo (F2.2: datos de la API).
// `producto` tiene la forma del contrato: id_producto, nombre, categoria, precio, existencias, disponible, imagen.
export default function ProductCard({ producto }) {
  const { agregar, disponible, limitarAStock } = useCarrito();
  const { mostrar } = useToast();
  const [cantidad, setCantidad] = useState(1);
  const libres = producto.disponible ? disponible(producto) : 0;
  const agotado = libres <= 0;

  const alCambiar = (n) => {
    const aplicada = limitarAStock(producto, n);
    setCantidad(aplicada);
    return aplicada;
  };

  const alAgregar = () => {
    agregar(producto, cantidad);
    setCantidad(1);
  };

  return (
    <article className="producto tarjeta" data-testid={`producto-${producto.id_producto}`}>
      {/* F2.4: la imagen y el nombre llevan al detalle. El enlace de la imagen queda fuera del orden del
          teclado (tabIndex -1) para no pasar dos veces por el mismo destino; el lector de pantalla sí lo lee. */}
      <Link to={`/producto/${producto.id_producto}`} className="producto__imagen" tabIndex={-1}>
        <ImagenProducto producto={producto} className="producto__foto" />
        {agotado ? (
          <span className="producto__insignia producto__insignia--agotado">Agotado</span>
        ) : libres <= 3 ? (
          <span className="producto__insignia producto__insignia--pocas">Últimas {libres}</span>
        ) : null}
      </Link>
      <div className="producto__cuerpo">
        <span className="producto__categoria">{producto.categoria}</span>
        <h3 className="producto__nombre">
          <Link to={`/producto/${producto.id_producto}`} className="producto__enlace">
            {producto.nombre}
          </Link>
        </h3>
        <p className="producto__precio">{formatoCOP(producto.precio)}</p>
        <p className={`producto__stock${agotado ? " producto__stock--agotado" : ""}`}>
          {agotado ? "Sin unidades disponibles" : `Stock disponible: ${libres}`}
        </p>
        <div className="producto__acciones">
          <CantidadInput
            value={cantidad}
            max={Math.max(producto.existencias, 1)}
            label={`Cantidad a agregar de ${producto.nombre}`}
            disabled={!producto.disponible}
            onChange={alCambiar}
            onMinimo={() => mostrar("La cantidad mínima es 1.")}
          />
          <button
            type="button"
            className="btn btn--primario"
            disabled={agotado}
            aria-label={`Agregar ${producto.nombre} al carrito`}
            onClick={alAgregar}
          >
            {producto.disponible ? "Agregar" : "Agotado"}
          </button>
        </div>
      </div>
    </article>
  );
}

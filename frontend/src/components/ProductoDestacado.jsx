import { Bike } from 'lucide-react';
import { PRODUCTOS } from '../data/productos';
import { useCarrito } from '../context/CarritoContext';
import { formatoCOP } from '../utils/formato';

// Bloque "Destacado" de la tienda (rediseño). Mientras el catálogo sea simulado, muestra el producto
// marcado con `destacado: true` en data/productos.js; en F2.2 se elige con los datos de la API.
export default function ProductoDestacado() {
  const { agregar, disponible } = useCarrito();
  const producto = PRODUCTOS.find((p) => p.destacado);
  if (!producto) return null;

  const libres = disponible(producto.id);

  return (
    <section className="destacado tarjeta" aria-labelledby="titulo-destacado">
      <div className="destacado__texto">
        <span className="etiqueta etiqueta--destacado">Destacado</span>
        <h1 id="titulo-destacado" className="destacado__nombre">
          {producto.nombre}
        </h1>
        {producto.descripcion && <p className="destacado__descripcion">{producto.descripcion}</p>}
        <div className="destacado__compra">
          <span className="destacado__precio">{formatoCOP(producto.precio)}</span>
          <button
            type="button"
            className="btn btn--primario"
            disabled={libres <= 0}
            aria-label={`Agregar ${producto.nombre} al carrito desde destacados`}
            onClick={() => agregar(producto.id, 1)}
          >
            {libres <= 0 ? 'Sin unidades disponibles' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
      {/* Imagen de reemplazo (decisión L) */}
      <div className="destacado__imagen" aria-hidden="true">
        <Bike size={96} strokeWidth={1.1} />
      </div>
    </section>
  );
}

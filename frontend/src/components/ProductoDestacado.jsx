import { useCarrito } from '../context/CarritoContext';
import { formatoCOP } from '../utils/formato';
import ImagenProducto from './ImagenProducto';

// Bloque "Destacado" de la tienda (rediseño). Desde F2.2 lo elige la página con los datos de la API:
// el producto disponible de mayor precio del catálogo completo (ver elegirDestacado).
export default function ProductoDestacado({ producto }) {
  const { agregar, disponible } = useCarrito();
  if (!producto) return null;

  const libres = disponible(producto);

  return (
    <section className="destacado tarjeta" aria-labelledby="titulo-destacado">
      <div className="destacado__texto">
        <span className="etiqueta etiqueta--destacado">Destacado</span>
        <span className="destacado__categoria">{producto.categoria}</span>
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
            onClick={() => agregar(producto, 1)}
          >
            {libres <= 0 ? 'Sin unidades disponibles' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
      <div className="destacado__imagen">
        <ImagenProducto producto={producto} className="destacado__foto" />
      </div>
    </section>
  );
}

// El disponible más caro; con empate, el de menor id (estable). null si no hay ninguno disponible.
export function elegirDestacado(productos) {
  return (
    productos
      .filter((p) => p.disponible)
      .sort((a, b) => b.precio - a.precio || a.id_producto - b.id_producto)[0] ?? null
  );
}

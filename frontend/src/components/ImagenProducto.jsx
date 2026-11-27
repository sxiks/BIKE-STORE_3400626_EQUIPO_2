import { useState } from 'react';
import { urlImagen } from '../utils/format';
import placeholder from '../assets/placeholder-producto.svg';

// Imagen de un producto con reemplazo local (decisión L): si el producto no tiene imagen o el archivo
// no existe en el servidor (las de la semilla), se muestra assets/placeholder-producto.svg.
export default function ImagenProducto({ producto, className = '' }) {
  const [fallo, setFallo] = useState(false);
  const url = urlImagen(producto.imagen);
  const usarReemplazo = fallo || !url;

  return (
    <img
      className={className}
      src={usarReemplazo ? placeholder : url}
      alt={usarReemplazo ? `${producto.nombre} (imagen no disponible)` : producto.nombre}
      loading="lazy"
      data-reemplazo={usarReemplazo ? 'si' : undefined}
      onError={() => setFallo(true)}
    />
  );
}

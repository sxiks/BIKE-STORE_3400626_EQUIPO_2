import { SERVER_URL } from '../config/env';

// Formatos de presentación compartidos: moneda (COP) y URL de las imágenes de productos.
const moneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const formatoCOP = (valor) => moneda.format(valor);

// Nombre de archivo de la API → URL pública de la imagen (null si el producto no tiene).
export function urlImagen(nombreArchivo) {
  return nombreArchivo ? `${SERVER_URL}/uploads/productos/${nombreArchivo}` : null;
}

import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import ImagenProducto from './ImagenProducto';
import { formatoCOP } from '../utils/formato';
import '../assets/productos.css';

// Tabla del panel de productos (CU-15) con las acciones de CU-13 (editar) y CU-14 (activar o inactivar).
// Mismo estilo que la de usuarios: cada fila se ve como una tarjeta, pero sigue siendo una tabla.
// Solo props: no llama a la API.
//   productos: [Producto] · idOcupado: id de la fila que se está guardando
//   onCambiarEstado(producto): pide la acción; quien usa la tabla confirma y guarda.
export default function ProductosTabla({ productos, idOcupado = null, onCambiarEstado }) {
  return (
    <table className="productos-tabla">
      <caption className="solo-lector">Listado de productos</caption>
      <thead>
        <tr>
          <th scope="col">Producto</th>
          <th scope="col">Categoría</th>
          <th scope="col">Precio</th>
          <th scope="col">Existencias</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {productos.map((producto) => {
          const activo = producto.estado === 'activo';
          const ocupado = producto.id_producto === idOcupado;

          return (
            <tr key={producto.id_producto} className={activo ? undefined : 'productos-tabla__fila--inactiva'}>
              <td data-etiqueta="Producto">
                <span className="productos-tabla__producto">
                  <span className="productos-tabla__miniatura">
                    <ImagenProducto producto={producto} />
                  </span>
                  <span className="productos-tabla__nombre">{producto.nombre}</span>
                </span>
              </td>
              <td data-etiqueta="Categoría">{producto.categoria}</td>
              <td data-etiqueta="Precio" className="productos-tabla__numero">
                {formatoCOP(producto.precio)}
              </td>
              <td data-etiqueta="Existencias" className="productos-tabla__numero">
                {producto.existencias}
                {producto.existencias === 0 && <span className="etiqueta etiqueta--aviso productos-tabla__agotado">Agotado</span>}
              </td>
              <td data-etiqueta="Estado">
                <span className="productos-tabla__estado">
                  <span className={`productos-tabla__punto productos-tabla__punto--${producto.estado}`} aria-hidden="true" />
                  {activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td data-etiqueta="Acciones">
                <div className="productos-tabla__acciones">
                  <Link
                    to={`/admin/productos/${producto.id_producto}`}
                    className="btn btn--suave"
                    aria-label={`Editar ${producto.nombre}`}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Editar
                  </Link>
                  <button
                    type="button"
                    className="btn btn--suave"
                    disabled={ocupado}
                    aria-label={`${activo ? 'Inactivar' : 'Activar'} ${producto.nombre}`}
                    onClick={() => onCambiarEstado(producto)}
                  >
                    {activo ? 'Inactivar' : 'Activar'}
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

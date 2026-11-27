import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, PackageX } from 'lucide-react';
import { useCarrito } from '../context/CarritoContext';
import { useToast } from '../context/ToastContext';
import { obtenerProducto } from '../services/productos.service';
import { formatoCOP } from '../utils/formato';
import BarraCliente from '../components/BarraCliente';
import CarritoPanel from '../components/CarritoPanel';
import CantidadInput from '../components/CantidadInput';
import ImagenProducto from '../components/ImagenProducto';
import '../assets/panel.css';
import '../assets/tienda.css';
import '../assets/detalle.css';

// Detalle de un producto en la tienda (F2.4): portada y galería, datos completos y agregar al carrito.
// Ruta pública /producto/:id (el admin no llega: SinAdmin). Usa el mismo carrito que la tienda
// (CarritoProvider en App.jsx: navegador para visitantes, API para clientes).
export default function ProductoPage() {
  return <DetalleContenido />;
}

function DetalleContenido() {
  const { id } = useParams();
  const { totalUnidades, sincronizarProductos } = useCarrito();
  const [producto, setProducto] = useState(null);
  const [estado, setEstado] = useState({ cargando: true, error: null, status: 0 });
  const [version, setVersion] = useState(0);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const abrirCarrito = useCallback(() => setCarritoAbierto(true), []);
  const cerrarCarrito = useCallback(() => setCarritoAbierto(false), []);

  useEffect(() => {
    let cancelado = false;
    setEstado({ cargando: true, error: null, status: 0 });
    obtenerProducto(id)
      .then(({ data }) => {
        if (cancelado) return;
        setProducto(data);
        sincronizarProductos([data]); // precio y stock al día en la línea del carrito
        setEstado({ cargando: false, error: null, status: 0 });
      })
      .catch((error) => {
        if (!cancelado) setEstado({ cargando: false, error: error.message, status: error.status ?? 0 });
      });
    return () => {
      cancelado = true;
    };
  }, [id, version, sincronizarProductos]);

  // Un id que no es un número también es "no disponible" (el backend responde 400).
  const noDisponible = estado.status === 404 || estado.status === 400;

  return (
    <>
      <BarraCliente carrito={{ totalUnidades, onAbrir: abrirCarrito }} />
      <main className="contenedor detalle">
        <Link to="/" className="detalle__volver">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a la tienda
        </Link>

        {estado.cargando && (
          <div className="detalle__esqueleto tarjeta" aria-busy="true" aria-label="Cargando producto" />
        )}

        {!estado.cargando && noDisponible && (
          <section className="panel__aviso tarjeta detalle__no-disponible">
            <PackageX size={36} aria-hidden="true" />
            <h1>Producto no disponible</h1>
            <p>Este producto no existe o ya no se vende. Mira los demás en la tienda.</p>
            <Link to="/" className="btn btn--primario">
              Ir a la tienda
            </Link>
          </section>
        )}

        {!estado.cargando && estado.error && !noDisponible && (
          <div className="catalogo__error">
            <p className="alerta alerta--error" role="alert">
              {estado.error}
            </p>
            <button type="button" className="btn btn--primario" onClick={() => setVersion((v) => v + 1)}>
              Reintentar
            </button>
          </div>
        )}

        {!estado.cargando && !estado.error && producto && <Detalle producto={producto} />}
      </main>
      <CarritoPanel abierto={carritoAbierto} onCerrar={cerrarCarrito} />
    </>
  );
}

function Detalle({ producto }) {
  const { agregar, disponible, limitarAStock } = useCarrito();
  const { mostrar } = useToast();
  const [cantidad, setCantidad] = useState(1);
  // Portada primero y luego la galería, en su orden.
  const imagenes = [
    { clave: 'portada', imagen: producto.imagen },
    ...(producto.imagenes ?? []).map((img) => ({ clave: String(img.id_imagen), imagen: img.imagen }))
  ];
  const [actual, setActual] = useState(0);
  const libres = producto.disponible ? disponible(producto) : 0;
  const agotado = libres <= 0;

  const alCambiar = (n) => {
    const aplicada = limitarAStock(producto, n);
    setCantidad(aplicada);
    return aplicada;
  };

  return (
    <article className="detalle__producto" aria-labelledby="detalle-nombre">
      <div className="detalle__galeria">
        <div className="detalle__principal tarjeta">
          <ImagenProducto
            key={imagenes[actual].clave}
            producto={{ imagen: imagenes[actual].imagen, nombre: `${producto.nombre}, imagen ${actual + 1} de ${imagenes.length}` }}
          />
        </div>
        {imagenes.length > 1 && (
          <div className="detalle__miniaturas" role="group" aria-label="Imágenes del producto">
            {imagenes.map((img, i) => (
              <button
                key={img.clave}
                type="button"
                className={`detalle__miniatura${i === actual ? ' detalle__miniatura--activa' : ''}`}
                aria-label={`Ver imagen ${i + 1} de ${imagenes.length}`}
                aria-pressed={i === actual}
                onClick={() => setActual(i)}
              >
                <ImagenProducto producto={{ imagen: img.imagen, nombre: producto.nombre }} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="detalle__info">
        <span className="producto__categoria">{producto.categoria}</span>
        <h1 id="detalle-nombre" className="detalle__nombre">
          {producto.nombre}
        </h1>
        <p className="detalle__precio">{formatoCOP(producto.precio)}</p>
        <p className={`producto__stock${agotado ? ' producto__stock--agotado' : ''}`}>
          {agotado ? 'Sin unidades disponibles' : libres <= 3 ? `Últimas ${libres} unidades` : `Stock disponible: ${libres}`}
        </p>

        <div className="detalle__compra">
          <CantidadInput
            value={cantidad}
            max={Math.max(producto.existencias, 1)}
            label={`Cantidad a agregar de ${producto.nombre}`}
            disabled={!producto.disponible}
            onChange={alCambiar}
            onMinimo={() => mostrar('La cantidad mínima es 1.')}
          />
          <button
            type="button"
            className="btn btn--primario"
            disabled={agotado}
            aria-label={`Agregar ${producto.nombre} al carrito`}
            onClick={() => {
              agregar(producto, cantidad);
              setCantidad(1);
            }}
          >
            {producto.disponible ? 'Agregar al carrito' : 'Agotado'}
          </button>
        </div>

        <section className="detalle__descripcion" aria-labelledby="detalle-descripcion">
          <h2 id="detalle-descripcion">Descripción</h2>
          <p>{producto.descripcion || 'Este producto aún no tiene descripción.'}</p>
        </section>
      </div>
    </article>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import { listarCategorias, listarProductos, ORDENES } from '../services/productos.service';
import BarraCliente from '../components/BarraCliente';
import ProductoDestacado, { elegirDestacado } from '../components/ProductoDestacado';
import FiltrosCatalogo from '../components/FiltrosCatalogo';
import Catalogo from '../components/Catalogo';
import CarritoPanel from '../components/CarritoPanel';
import '../assets/tienda.css';

// Tienda (CU-01, CU-02). Ruta pública; el admin no llega aquí (SinAdmin).
// F2.2: categorías y productos vienen de la API. La categoría y el orden se guardan en la URL
// (?categoria=3&orden=precio_asc) para poder compartir el enlace; cada cambio vuelve a pedir los productos.
// El carrito (CarritoProvider en App.jsx) vive en el navegador para visitantes y en la API para clientes (F3.1).
export default function TiendaPage() {
  return <TiendaContenido />;
}

// Lee la URL descartando valores inválidos: categoría numérica y orden de la lista permitida.
function leerFiltros(params) {
  const categoria = params.get('categoria') ?? '';
  const orden = params.get('orden') ?? '';
  return {
    categoria: /^\d+$/.test(categoria) ? categoria : '',
    orden: ORDENES.includes(orden) ? orden : ''
  };
}

function TiendaContenido() {
  const { totalUnidades, sincronizarProductos } = useCarrito();
  const [params, setParams] = useSearchParams();
  const { categoria, orden } = leerFiltros(params);

  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState(null); // null = cargando la primera vez
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0); // subirlo vuelve a pedir (Reintentar)
  const [busqueda, setBusqueda] = useState('');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const abrirCarrito = useCallback(() => setCarritoAbierto(true), []);
  const cerrarCarrito = useCallback(() => setCarritoAbierto(false), []);

  // Categorías: una sola vez. Si fallan, la tienda sigue funcionando sin las pastillas.
  useEffect(() => {
    listarCategorias()
      .then(({ data }) => setCategorias(Array.isArray(data) ? data : []))
      .catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);
    listarProductos({ categoria, orden })
      .then(({ data }) => {
        if (cancelado) return;
        const lista = Array.isArray(data) ? data : [];
        setProductos(lista);
        sincronizarProductos(lista); // precio y stock al día en las líneas del carrito
      })
      .catch((err) => {
        if (!cancelado) setError(err.message);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [categoria, orden, version, sincronizarProductos]);

  // Cambia un filtro en la URL; un valor vacío se quita para dejar la URL limpia.
  function cambiarFiltro(clave, valor) {
    const siguiente = new URLSearchParams(params);
    if (valor) siguiente.set(clave, valor);
    else siguiente.delete(clave);
    setParams(siguiente);
  }

  const nombreCategoria = categorias.find((c) => String(c.id_categoria) === categoria)?.nombre;
  // El destacado solo se muestra en la vista inicial (todas las categorías y sin búsqueda).
  const destacado = !categoria && !busqueda.trim() && productos ? elegirDestacado(productos) : null;

  return (
    <>
      <BarraCliente
        carrito={{ totalUnidades, onAbrir: abrirCarrito }}
        busqueda={{ valor: busqueda, onCambiar: setBusqueda }}
      />
      <main className="contenedor tienda">
        {destacado && <ProductoDestacado producto={destacado} />}

        <FiltrosCatalogo
          categorias={categorias}
          categoria={categoria}
          orden={orden}
          onCategoria={(valor) => cambiarFiltro('categoria', valor)}
          onOrden={(valor) => cambiarFiltro('orden', valor)}
        />

        {error ? (
          <div className="catalogo__error">
            <p className="alerta alerta--error" role="alert">
              {error}
            </p>
            <button type="button" className="btn btn--primario" onClick={() => setVersion((v) => v + 1)}>
              Reintentar
            </button>
          </div>
        ) : productos === null ? (
          <div className="catalogo__grid" aria-busy="true" aria-label="Cargando productos">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="producto producto--esqueleto tarjeta" aria-hidden="true" />
            ))}
          </div>
        ) : (
          <div className={cargando ? 'catalogo--actualizando' : undefined} aria-busy={cargando}>
            <Catalogo productos={productos} busqueda={busqueda} titulo={nombreCategoria ?? 'Bicicletas y accesorios'} />
          </div>
        )}
      </main>
      <CarritoPanel abierto={carritoAbierto} onCerrar={cerrarCarrito} />
    </>
  );
}

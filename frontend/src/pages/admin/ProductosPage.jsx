import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../context/ToastContext';
import { cambiarEstadoProducto, listarCategorias, listarProductosAdmin } from '../../services/productos.service';
import ProductosFiltros from '../../components/ProductosFiltros';
import ProductosTabla from '../../components/ProductosTabla';
import DialogoConfirmacion from '../../components/DialogoConfirmacion';
import '../../assets/panel.css';
import '../../assets/productos.css';

// Panel de productos del administrador (F2.3 · CU-14, CU-15). Crear y editar están en ProductoFormPage.
// Mismo patrón que UsuariosPage: la página orquesta; filtros, tabla y diálogo solo reciben props.

// Texto del diálogo: inactivar es borrado lógico (CU-14), el producto no se elimina.
function describirAccion({ producto, nuevo }) {
  return nuevo === 'inactivo'
    ? {
        titulo: 'Inactivar producto',
        mensaje: `¿Inactivar ${producto.nombre}? Dejará de verse en la tienda, pero no se elimina: puedes activarlo de nuevo cuando quieras.`,
        textoConfirmar: 'Sí, inactivar',
        peligro: true
      }
    : {
        titulo: 'Activar producto',
        mensaje: `¿Activar ${producto.nombre}? Volverá a verse en la tienda.`,
        textoConfirmar: 'Sí, activar',
        peligro: false
      };
}

export default function ProductosPage() {
  const { mostrar } = useToast();

  const [filtros, setFiltros] = useState({ q: '', categoria: '', estado: '' });
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState(null); // null = aún no llega la primera respuesta
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [version, setVersion] = useState(0); // subirlo vuelve a pedir el listado (Reintentar, 404)
  const [pendiente, setPendiente] = useState(null); // { producto, nuevo: 'activo' | 'inactivo' }
  const [guardando, setGuardando] = useState(false);

  const qRetrasado = useDebounce(filtros.q);

  // Las categorías solo alimentan el filtro: si fallan, el listado sigue funcionando sin ese filtro.
  useEffect(() => {
    let cancelado = false;
    listarCategorias()
      .then(({ data }) => {
        if (!cancelado && Array.isArray(data)) setCategorias(data);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setErrorCarga(null);

    listarProductosAdmin({ q: qRetrasado, categoria: filtros.categoria, estado: filtros.estado })
      .then(({ data }) => {
        if (!cancelado) setProductos(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!cancelado) setErrorCarga(error.message);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [qRetrasado, filtros.categoria, filtros.estado, version]);

  const cambiarFiltro = useCallback((campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const cancelar = useCallback(() => setPendiente(null), []);

  function pedirCambioEstado(producto) {
    setPendiente({ producto, nuevo: producto.estado === 'activo' ? 'inactivo' : 'activo' });
  }

  async function confirmar() {
    const { producto, nuevo } = pendiente;
    setGuardando(true);
    try {
      const { data } = await cambiarEstadoProducto(producto.id_producto, nuevo);
      // Se reemplaza la fila con lo que respondió el backend. Si hay un filtro de estado, la fila
      // ya no cumple el filtro y se quita, para que el listado muestre lo que pidió el admin.
      setProductos((prev) =>
        prev
          .map((p) => (p.id_producto === data.id_producto ? data : p))
          .filter((p) => !filtros.estado || p.estado === filtros.estado)
      );
      mostrar(`${data.nombre} quedó ${data.estado === 'activo' ? 'activo' : 'inactivo'}.`);
    } catch (error) {
      mostrar(error.message);
      if (error.status === 404) setVersion((v) => v + 1); // ya no existe: se refresca el listado
    } finally {
      setGuardando(false);
      setPendiente(null);
    }
  }

  const hayFiltros = Boolean(filtros.q.trim() || filtros.categoria || filtros.estado);
  const dialogo = pendiente ? describirAccion(pendiente) : null;

  return (
    <main className="contenedor contenedor--panel">
      <header className="panel__encabezado productos__encabezado">
        <div>
          <h1>Productos</h1>
          <p>Busca productos, edítalos o inactívalos. Inactivar oculta el producto de la tienda sin eliminarlo.</p>
        </div>
        <Link to="/admin/productos/nuevo" className="btn btn--primario">
          <Plus size={18} aria-hidden="true" />
          Nuevo producto
        </Link>
      </header>

      <ProductosFiltros
        q={filtros.q}
        categoria={filtros.categoria}
        estado={filtros.estado}
        categorias={categorias}
        onCambiar={cambiarFiltro}
      />

      {productos === null && cargando && (
        <p className="productos__mensaje" role="status">
          Cargando productos…
        </p>
      )}

      {errorCarga && (
        <div className="productos__error">
          <p className="alerta alerta--error" role="alert">
            {errorCarga}
          </p>
          <button type="button" className="btn btn--primario" onClick={() => setVersion((v) => v + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {!errorCarga && productos !== null && productos.length === 0 && (
        <p className="productos__mensaje tarjeta" role="status">
          {hayFiltros
            ? 'Ningún producto coincide con tu búsqueda. Prueba con otros datos o quita los filtros.'
            : 'Aún no hay productos. Crea el primero con "Nuevo producto".'}
        </p>
      )}

      {!errorCarga && productos !== null && productos.length > 0 && (
        <>
          <p className="productos__total" role="status">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
          </p>
          <div className="productos__contenedor" aria-busy={cargando}>
            <ProductosTabla
              productos={productos}
              idOcupado={guardando ? pendiente?.producto.id_producto : null}
              onCambiarEstado={pedirCambioEstado}
            />
          </div>
        </>
      )}

      {dialogo && (
        <DialogoConfirmacion
          titulo={dialogo.titulo}
          mensaje={dialogo.mensaje}
          textoConfirmar={dialogo.textoConfirmar}
          peligro={dialogo.peligro}
          ocupado={guardando}
          onConfirmar={confirmar}
          onCancelar={cancelar}
        />
      )}
    </main>
  );
}

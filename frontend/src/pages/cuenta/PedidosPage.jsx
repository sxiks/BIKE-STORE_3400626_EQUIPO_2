import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, PackageOpen } from 'lucide-react';
import { listarPedidos } from '../../services/pedidos.service';
import { formatoCOP } from '../../utils/formato';
import { estadoPedido, formatoFechaHora } from '../../utils/pedidos';
import '../../assets/panel.css';
import '../../assets/pedidos.css';

// Mis pedidos (F3.2 · CU-08): historial del cliente con GET /pedidos. La API nunca incluye el carrito
// y los devuelve del más reciente al más antiguo.
export default function PedidosPage() {
  const [pedidos, setPedidos] = useState(null); // null = cargando
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setError(null);
    listarPedidos()
      .then(({ data }) => {
        if (!cancelado) setPedidos(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelado) setError(err.message);
      });
    return () => {
      cancelado = true;
    };
  }, [version]);

  return (
    <main className="contenedor pedidos">
      <header className="panel__encabezado">
        <h1>Mis pedidos</h1>
        <p>Historial de tus compras. Abre un pedido para ver sus productos, el envío y los pagos.</p>
      </header>

      {pedidos === null && !error && (
        <p className="pedidos__mensaje" role="status">
          Cargando tus pedidos…
        </p>
      )}

      {error && (
        <div className="pedidos__error">
          <p className="alerta alerta--error" role="alert">
            {error}
          </p>
          <button type="button" className="btn btn--primario" onClick={() => setVersion((v) => v + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {!error && pedidos?.length === 0 && (
        <section className="pedidos__vacio tarjeta">
          <PackageOpen size={36} aria-hidden="true" />
          <p>Aún no tienes pedidos.</p>
          <Link to="/" className="btn btn--primario">
            Ir a la tienda
          </Link>
        </section>
      )}

      {!error && pedidos?.length > 0 && (
        <ul className="pedidos__lista" aria-label="Pedidos">
          {pedidos.map((pedido) => {
            const estado = estadoPedido(pedido.estado);
            return (
              <li key={pedido.id_pedido} className="pedidos__item tarjeta">
                <div className="pedidos__datos">
                  <span className="pedidos__numero">{pedido.numero_pedido}</span>
                  <span className="pedidos__fecha">{formatoFechaHora(pedido.fecha_pedido)}</span>
                </div>
                <span className={`etiqueta etiqueta--${estado.estilo}`}>{estado.texto}</span>
                <span className="pedidos__total">{formatoCOP(pedido.total)}</span>
                <Link
                  to={`/cuenta/pedidos/${pedido.numero_pedido}`}
                  className="pedidos__enlace"
                  aria-label={`Ver detalle del pedido ${pedido.numero_pedido}`}
                >
                  Ver detalle
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

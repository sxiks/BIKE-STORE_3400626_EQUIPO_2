import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, PackageX } from 'lucide-react';
import { usePedido } from '../../hooks/usePedido';
import DetallePedido from '../../components/DetallePedido';
import { estadoPedido, formatoFechaHora } from '../../utils/pedidos';
import '../../assets/panel.css';
import '../../assets/pedidos.css';

// Detalle de un pedido para el admin (F4 · decisión N), con GET /pedidos/:numero. Solo lectura: el admin no
// paga ni cambia el estado. Reutiliza DetallePedido, el mismo cuerpo que ve el cliente.
// "Volver" regresa al listado con los filtros que tenía (los manda el listado en location.state).
export default function PedidoAdminPage() {
  const { numero } = useParams();
  const location = useLocation();
  const { pedido, cargando, error, status, reintentar } = usePedido(numero);
  const rutaListado = `/admin/pedidos${location.state?.volver ?? ''}`;

  const volver = (
    <Link to={rutaListado} className="pedido__volver">
      <ArrowLeft size={16} aria-hidden="true" />
      Volver a pedidos
    </Link>
  );

  if (cargando) {
    return (
      <main className="contenedor contenedor--panel pedido">
        {volver}
        <p className="pedidos__mensaje" role="status">
          Cargando el pedido…
        </p>
      </main>
    );
  }

  if (status === 404) {
    return (
      <main className="contenedor contenedor--panel pedido">
        <section className="panel__aviso tarjeta">
          <PackageX size={36} aria-hidden="true" className="pedido__icono-aviso" />
          <h1>Pedido no encontrado</h1>
          <p>No existe el pedido {numero}.</p>
          <Link to={rutaListado} className="btn btn--primario">
            Ir a pedidos
          </Link>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="contenedor contenedor--panel pedido">
        {volver}
        <div className="pedidos__error">
          <p className="alerta alerta--error" role="alert">
            {error}
          </p>
          <button type="button" className="btn btn--primario" onClick={reintentar}>
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  const estado = estadoPedido(pedido.estado);

  return (
    <main className="contenedor contenedor--panel pedido">
      {volver}
      <header className="pedido__encabezado">
        <div>
          <h1>Pedido {pedido.numero_pedido}</h1>
          <p>Confirmado el {formatoFechaHora(pedido.fecha_pedido)}</p>
        </div>
        <span className={`etiqueta etiqueta--${estado.estilo} pedido__estado`}>{estado.texto}</span>
      </header>
      <DetallePedido pedido={pedido} />
    </main>
  );
}

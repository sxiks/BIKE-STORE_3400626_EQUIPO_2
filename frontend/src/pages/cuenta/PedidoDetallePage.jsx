import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, PackageX } from 'lucide-react';
import { usePedido } from '../../hooks/usePedido';
import DetallePedido from '../../components/DetallePedido';
import { formatoCOP } from '../../utils/formato';
import { estadoPedido, formatoFechaHora, sePuedePagar } from '../../utils/pedidos';
import '../../assets/panel.css';
import '../../assets/pedidos.css';

// Detalle de un pedido (F3.2 · CU-08) con GET /pedidos/:numero: productos (al precio con que se confirmó, R3),
// envío y pagos (componente DetallePedido, compartido con el admin). Si está pendiente o el pago se rechazó, ofrece "Pagar" (/cuenta/pedidos/:numero/pagar, F3.3).
// También es la confirmación después de pagar: el checkout llega aquí con state.pagado.
export default function PedidoDetallePage() {
  const { numero } = useParams();
  const location = useLocation();
  const recienPagado = Boolean(location.state?.pagado);
  const { pedido, reintentar, ...estadoCarga } = usePedido(numero);

  const volver = (
    <Link to="/cuenta/pedidos" className="pedido__volver">
      <ArrowLeft size={16} aria-hidden="true" />
      Volver a mis pedidos
    </Link>
  );

  if (estadoCarga.cargando) {
    return (
      <main className="contenedor pedido">
        {volver}
        <p className="pedidos__mensaje" role="status">
          Cargando el pedido…
        </p>
      </main>
    );
  }

  if (estadoCarga.status === 404) {
    return (
      <main className="contenedor pedido">
        <section className="panel__aviso tarjeta">
          <PackageX size={36} aria-hidden="true" className="pedido__icono-aviso" />
          <h1>Pedido no encontrado</h1>
          <p>No encontramos el pedido {numero} entre tus compras.</p>
          <Link to="/cuenta/pedidos" className="btn btn--primario">
            Ir a mis pedidos
          </Link>
        </section>
      </main>
    );
  }

  if (estadoCarga.error) {
    return (
      <main className="contenedor pedido">
        {volver}
        <div className="pedidos__error">
          <p className="alerta alerta--error" role="alert">
            {estadoCarga.error}
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
    <main className="contenedor pedido">
      {volver}

      <header className="pedido__encabezado">
        <div>
          <h1>Pedido {pedido.numero_pedido}</h1>
          <p>Realizado el {formatoFechaHora(pedido.fecha_pedido)}</p>
        </div>
        <span className={`etiqueta etiqueta--${estado.estilo} pedido__estado`}>{estado.texto}</span>
      </header>

      {recienPagado && pedido.estado === 'pagado' && (
        <p className="alerta alerta--exito pedido__confirmacion" role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <span>
            <strong>¡Gracias por tu compra!</strong> El pago fue aprobado y tu pedido está pagado.
          </span>
        </p>
      )}

      {sePuedePagar(pedido.estado) && (
        <section className="pedido__pagar tarjeta" aria-labelledby="pedido-pagar">
          <div>
            <h2 id="pedido-pagar">{pedido.estado === 'fallido' ? 'El pago fue rechazado' : 'Falta el pago'}</h2>
            <p id="pedido-pagar-nota">
              {pedido.estado === 'fallido'
                ? 'Puedes intentarlo de nuevo con otro medio de pago.'
                : 'Tu pedido está reservado hasta que lo pagues.'}
            </p>
          </div>
          <Link to={`/cuenta/pedidos/${pedido.numero_pedido}/pagar`} className="btn btn--primario" aria-describedby="pedido-pagar-nota">
            <CreditCard size={18} aria-hidden="true" />
            Pagar {formatoCOP(pedido.total)}
          </Link>
        </section>
      )}

      <DetallePedido pedido={pedido} />
    </main>
  );
}

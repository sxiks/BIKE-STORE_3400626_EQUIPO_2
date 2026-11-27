import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, PackageX } from 'lucide-react';
import { obtenerPedido } from '../../services/pedidos.service';
import { formatoCOP } from '../../utils/formato';
import { estadoPago, estadoPedido, formatoFechaHora, nombreMedio, sePuedePagar } from '../../utils/pedidos';
import '../../assets/panel.css';
import '../../assets/pedidos.css';

// Detalle de un pedido (F3.2 · CU-08) con GET /pedidos/:numero: productos (al precio con que se confirmó, R3),
// envío y pagos. Si está pendiente o el pago se rechazó, ofrece "Pagar" (/cuenta/pedidos/:numero/pagar, F3.3).
// También es la confirmación después de pagar: el checkout llega aquí con state.pagado.
export default function PedidoDetallePage() {
  const { numero } = useParams();
  const location = useLocation();
  const recienPagado = Boolean(location.state?.pagado);
  const [pedido, setPedido] = useState(null);
  const [estadoCarga, setEstadoCarga] = useState({ cargando: true, error: null, status: 0 });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setEstadoCarga({ cargando: true, error: null, status: 0 });
    obtenerPedido(numero)
      .then(({ data }) => {
        if (cancelado) return;
        setPedido(data);
        setEstadoCarga({ cargando: false, error: null, status: 0 });
      })
      .catch((err) => {
        if (!cancelado) setEstadoCarga({ cargando: false, error: err.message, status: err.status ?? 0 });
      });
    return () => {
      cancelado = true;
    };
  }, [numero, version]);

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
          <button type="button" className="btn btn--primario" onClick={() => setVersion((v) => v + 1)}>
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  const estado = estadoPedido(pedido.estado);
  const items = pedido.items ?? [];
  const pagos = pedido.pagos ?? [];

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

      <section className="pedido__seccion tarjeta" aria-labelledby="pedido-productos">
        <h2 id="pedido-productos">Productos</h2>
        <table className="pedido__tabla">
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Cantidad</th>
              <th scope="col">Precio unitario</th>
              <th scope="col">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id_producto}>
                <td data-etiqueta="Producto">{item.nombre}</td>
                <td data-etiqueta="Cantidad">{item.cantidad}</td>
                <td data-etiqueta="Precio unitario">{formatoCOP(item.precio_unitario)}</td>
                <td data-etiqueta="Subtotal">{formatoCOP(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                Total
              </th>
              <td data-testid="pedido-total">{formatoCOP(pedido.total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <div className="pedido__columnas">
        <section className="pedido__seccion tarjeta" aria-labelledby="pedido-envio">
          <h2 id="pedido-envio">Envío</h2>
          <address className="pedido__direccion">
            <strong>{pedido.envio_nombre}</strong>
            <span>{pedido.envio_direccion}</span>
            <span>
              {pedido.envio_ciudad}, {pedido.envio_departamento}
            </span>
            <span>Tel. {pedido.envio_telefono}</span>
          </address>
        </section>

        <section className="pedido__seccion tarjeta" aria-labelledby="pedido-pagos">
          <h2 id="pedido-pagos">Pagos</h2>
          {pagos.length === 0 ? (
            <p className="pedido__sin-pagos">Todavía no hay pagos.</p>
          ) : (
            <ul className="pedido__pagos" aria-label="Pagos del pedido">
              {pagos.map((pago) => {
                const ep = estadoPago(pago.estado);
                return (
                  <li key={pago.id_pago}>
                    <div>
                      <strong>{nombreMedio(pago.medio_pago)}</strong>
                      <span className="pedido__tarjeta">•••• {pago.ultimos4}</span>
                      <span className="pedido__fecha-pago">{formatoFechaHora(pago.created_at)}</span>
                    </div>
                    <div className="pedido__pago-resultado">
                      <span>{formatoCOP(pago.valor)}</span>
                      <span className={`etiqueta etiqueta--${ep.estilo}`}>{ep.texto}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

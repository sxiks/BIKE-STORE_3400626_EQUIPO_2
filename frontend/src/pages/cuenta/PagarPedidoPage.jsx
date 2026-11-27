import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PackageX } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { obtenerPedido } from '../../services/pedidos.service';
import { formatoCOP } from '../../utils/formato';
import { estadoPedido, sePuedePagar } from '../../utils/pedidos';
import FormularioPago from '../../components/FormularioPago';
import '../../assets/panel.css';
import '../../assets/checkout.css';
import '../../assets/pedidos.css';

// Pagar un pedido que ya existe (F3.3): /cuenta/pedidos/:numero/pagar. Sirve para terminar un pedido que quedó
// pendiente (el cliente salió del checkout) o reintentar uno con el pago rechazado (decisión F).
// Usa el mismo FormularioPago del checkout; al aprobarse, vuelve al detalle del pedido.
export default function PagarPedidoPage() {
  const { numero } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [pedido, setPedido] = useState(null);
  const [carga, setCarga] = useState({ cargando: true, error: null, status: 0 });

  useEffect(() => {
    let cancelado = false;
    obtenerPedido(numero)
      .then(({ data }) => {
        if (cancelado) return;
        setPedido(data);
        setCarga({ cargando: false, error: null, status: 0 });
      })
      .catch((err) => {
        if (!cancelado) setCarga({ cargando: false, error: err.message, status: err.status ?? 0 });
      });
    return () => {
      cancelado = true;
    };
  }, [numero]);

  const detalle = `/cuenta/pedidos/${numero}`;
  const volver = (
    <Link to={detalle} className="pedido__volver">
      <ArrowLeft size={16} aria-hidden="true" />
      Volver al pedido
    </Link>
  );

  if (carga.cargando) {
    return (
      <main className="contenedor checkout">
        <p className="checkout__mensaje" role="status">
          Cargando el pedido…
        </p>
      </main>
    );
  }

  if (carga.status === 404) {
    return (
      <main className="contenedor checkout">
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

  if (carga.error) {
    return (
      <main className="contenedor checkout">
        {volver}
        <p className="alerta alerta--error" role="alert">
          {carga.error}
        </p>
      </main>
    );
  }

  const estado = estadoPedido(pedido.estado);

  return (
    <main className="contenedor checkout">
      {volver}
      <header className="panel__encabezado">
        <h1>Pagar pedido {pedido.numero_pedido}</h1>
        <p>
          <span className={`etiqueta etiqueta--${estado.estilo}`}>{estado.texto}</span> · Total {formatoCOP(pedido.total)}
        </p>
      </header>

      {!sePuedePagar(pedido.estado) ? (
        <section className="checkout__vacio tarjeta">
          <p>Este pedido ya está pagado.</p>
          <Link to={detalle} className="btn btn--primario">
            Ver el pedido
          </Link>
        </section>
      ) : (
        <>
          <section className="checkout__resumen tarjeta" aria-labelledby="pagar-resumen">
            <h2 id="pagar-resumen">Resumen</h2>
            <ul className="checkout__lineas">
              {(pedido.items ?? []).map((item) => (
                <li key={item.id_producto}>
                  <span>
                    {item.nombre} <span className="checkout__cantidad">× {item.cantidad}</span>
                  </span>
                  <strong>{formatoCOP(item.subtotal)}</strong>
                </li>
              ))}
            </ul>
          </section>
          <FormularioPago
            pedido={pedido}
            onAprobado={(data) => {
              mostrar(`¡Pago aprobado! Tu pedido ${data.numero_pedido} está pagado.`);
              navigate(detalle, { replace: true, state: { pagado: true } });
            }}
            onYaPagado={() => navigate(detalle, { replace: true })}
          />
        </>
      )}
    </main>
  );
}

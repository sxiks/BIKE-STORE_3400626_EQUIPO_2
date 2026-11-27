import { formatoCOP } from '../utils/formato';
import { estadoPago, formatoFechaHora, nombreMedio } from '../utils/pedidos';
import '../assets/pedidos.css';

// Cuerpo del detalle de un pedido: productos (al precio con que se confirmó, R3), envío y pagos.
// Solo props, sin acciones: lo comparten el detalle del cliente (F3.2) y el del admin (F4 · decisión N).
//   pedido: Pedido con items y pagos (GET /pedidos/:numero)
export default function DetallePedido({ pedido }) {
  const items = pedido.items ?? [];
  const pagos = pedido.pagos ?? [];

  return (
    <>
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
    </>
  );
}

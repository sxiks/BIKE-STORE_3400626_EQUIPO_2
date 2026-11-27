import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { useCarrito } from '../../context/CarritoContext';
import { formatoCOP } from '../../utils/formato';
import '../../assets/panel.css';
import '../../assets/checkout.css';

// /checkout PROVISIONAL (F3.1): solo para clientes (ProtectedRoute en App.jsx). Un visitante que pulsa
// "Comprar" llega aquí después de iniciar sesión, con su carrito ya pasado a la API.
// Muestra el resumen del carrito; el envío y el pago simulado llegan en F3.3, que reemplaza esta página.
export default function CheckoutPage() {
  const { cargando, lineas, totalUnidades, totalCompra, puedeComprar } = useCarrito();

  return (
    <main className="contenedor checkout">
      <header className="panel__encabezado">
        <h1>Finalizar compra</h1>
        <p>Revisa tu pedido antes de continuar.</p>
      </header>

      {cargando && (
        <p className="checkout__mensaje" role="status">
          Cargando tu carrito…
        </p>
      )}

      {!cargando && lineas.length === 0 && (
        <section className="checkout__vacio tarjeta">
          <p>Tu carrito está vacío.</p>
          <Link to="/" className="btn btn--primario">
            Ir a la tienda
          </Link>
        </section>
      )}

      {!cargando && lineas.length > 0 && (
        <>
          {!puedeComprar && (
            <p className="alerta alerta--aviso" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              Hay productos de tu carrito que no se pueden comprar. Vuelve a la tienda y revisa tu carrito.
            </p>
          )}

          <section className="checkout__resumen tarjeta" aria-labelledby="checkout-resumen">
            <h2 id="checkout-resumen">Resumen</h2>
            <ul className="checkout__lineas">
              {lineas.map((l) => (
                <li key={l.id} className={l.disponible ? undefined : 'checkout__linea--no-disponible'}>
                  <span>
                    {l.nombre} <span className="checkout__cantidad">× {l.cantidad}</span>
                  </span>
                  <strong>{formatoCOP(l.subtotal)}</strong>
                </li>
              ))}
            </ul>
            <dl className="checkout__total">
              <div>
                <dt>Unidades</dt>
                <dd>{totalUnidades}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd data-testid="checkout-total">{formatoCOP(totalCompra)}</dd>
              </div>
            </dl>
          </section>

          <p className="checkout__pronto alerta alerta--aviso">
            <Clock size={18} aria-hidden="true" />
            El envío y el pago llegan en la siguiente tarea (F3.3). Tu carrito queda guardado en tu cuenta.
          </p>

          <Link to="/" className="checkout__volver">
            Seguir comprando
          </Link>
        </>
      )}
    </main>
  );
}

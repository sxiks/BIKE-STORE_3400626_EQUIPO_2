import { Link } from 'react-router-dom';
import { formatoFechaHora } from '../utils/pedidos';
import '../assets/tablero.css';

// Alertas operativas del tablero (F4.1 · CU-16) con los datos de GET /dashboard/alertas.
// Cada producto lleva a su edición y cada pedido a su detalle en el panel. Solo props.
//   alertas: respuesta de la API (umbral_stock_bajo, stock_bajo, agotados, inactivos_en_carritos,
//            pedidos_pendientes, pedidos_fallidos)

function Tarjeta({ id, titulo, nota, cantidad, vacio, pie, children }) {
  return (
    <section className="tablero-alerta tarjeta" aria-labelledby={id}>
      <header className="tablero-alerta__cabecera">
        <h3 id={id}>{titulo}</h3>
        <span className={`etiqueta etiqueta--${cantidad > 0 ? 'aviso' : 'exito'}`} aria-label={`${cantidad} en total`}>
          {cantidad}
        </span>
      </header>
      {nota && <p className="tablero-alerta__nota">{nota}</p>}
      {cantidad === 0 ? <p className="tablero-alerta__vacio">{vacio}</p> : <ul className="tablero-alerta__lista">{children}</ul>}
      {pie}
    </section>
  );
}

function Pedidos({ pedidos }) {
  return pedidos.map((p) => (
    <li key={p.id_pedido}>
      <Link to={`/admin/pedidos/${p.numero_pedido}`}>{p.numero_pedido}</Link>
      <span className="tablero-alerta__dato">{formatoFechaHora(p.fecha_pedido)}</span>
    </li>
  ));
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export default function AlertasTablero({ alertas }) {
  const { umbral_stock_bajo: umbral, stock_bajo, agotados, inactivos_en_carritos, pedidos_pendientes, pedidos_fallidos } = alertas;

  return (
    <div className="tablero-alertas">
      <Tarjeta
        id="alerta-stock-bajo"
        titulo="Stock bajo"
        nota={`Productos activos con 1 a ${umbral} unidades.`}
        cantidad={stock_bajo.length}
        vacio="Ningún producto con stock bajo."
      >
        {stock_bajo.map((p) => (
          <li key={p.id_producto}>
            <Link to={`/admin/productos/${p.id_producto}`}>{p.nombre}</Link>
            <span className="tablero-alerta__dato">{plural(p.existencias, 'unidad', 'unidades')}</span>
          </li>
        ))}
      </Tarjeta>

      <Tarjeta id="alerta-agotados" titulo="Agotados" nota="Productos activos sin existencias." cantidad={agotados.length} vacio="Ningún producto agotado.">
        {agotados.map((p) => (
          <li key={p.id_producto}>
            <Link to={`/admin/productos/${p.id_producto}`}>{p.nombre}</Link>
          </li>
        ))}
      </Tarjeta>

      <Tarjeta
        id="alerta-inactivos"
        titulo="Inactivos en carritos"
        nota="Productos inactivos que los clientes todavía tienen en el carrito."
        cantidad={inactivos_en_carritos.length}
        vacio="Ningún carrito tiene productos inactivos."
      >
        {inactivos_en_carritos.map((p) => (
          <li key={p.id_producto}>
            <Link to={`/admin/productos/${p.id_producto}`}>{p.nombre}</Link>
            <span className="tablero-alerta__dato">en {plural(p.carritos, 'carrito', 'carritos')}</span>
          </li>
        ))}
      </Tarjeta>

      <Tarjeta
        id="alerta-pendientes"
        titulo="Pedidos pendientes de pago"
        cantidad={pedidos_pendientes.length}
        vacio="No hay pedidos pendientes."
        pie={
          pedidos_pendientes.length > 0 && (
            <Link to="/admin/pedidos?estado=pendiente" className="tablero-alerta__pie">
              Ver todos los pendientes
            </Link>
          )
        }
      >
        <Pedidos pedidos={pedidos_pendientes} />
      </Tarjeta>

      <Tarjeta
        id="alerta-fallidos"
        titulo="Pedidos con pago rechazado"
        cantidad={pedidos_fallidos.length}
        vacio="No hay pedidos con pago rechazado."
        pie={
          pedidos_fallidos.length > 0 && (
            <Link to="/admin/pedidos?estado=fallido" className="tablero-alerta__pie">
              Ver todos los rechazados
            </Link>
          )
        }
      >
        <Pedidos pedidos={pedidos_fallidos} />
      </Tarjeta>
    </div>
  );
}

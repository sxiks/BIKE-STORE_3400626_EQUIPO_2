import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { listarPedidosAdmin } from '../../services/pedidos.service';
import Segmentado from '../../components/Segmentado';
import { formatoCOP } from '../../utils/formato';
import { estadoPedido, formatoFechaHora } from '../../utils/pedidos';
import { rangoValido } from '../../utils/fechas';
import '../../assets/panel.css';
import '../../assets/pedidos-admin.css';

// Pedidos del panel del admin (F4 · decisión N): todos los pedidos confirmados de todos los clientes
// (nunca los carritos) con GET /pedidos/admin. Solo lectura. Los filtros viven en la URL, para que el tablero
// pueda enlazar aquí ya filtrado (?estado=pendiente) y para que "Volver" desde un pedido los conserve.
const ESTADOS = [
  { valor: '', texto: 'Todos' },
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'pagado', texto: 'Pagados' },
  { valor: 'fallido', texto: 'Rechazados' }
];
const LIMITE_API = 200;

export default function PedidosAdminPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const estado = params.get('estado') ?? '';
  const desde = params.get('desde') ?? '';
  const hasta = params.get('hasta') ?? '';
  const qUrl = params.get('q') ?? '';

  const [q, setQ] = useState(qUrl);
  const qRetrasado = useDebounce(q);
  const [pedidos, setPedidos] = useState(null); // null = aún no llega la primera respuesta
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const rangoOk = rangoValido({ desde, hasta });

  // Cambia un filtro en la URL sin llenar el historial (replace).
  function cambiar(campo, valor) {
    setParams(
      (prev) => {
        const siguiente = new URLSearchParams(prev);
        if (valor) siguiente.set(campo, valor);
        else siguiente.delete(campo);
        return siguiente;
      },
      { replace: true }
    );
  }

  // La búsqueda pasa a la URL con retraso, para no pedir la lista en cada tecla. El efecto solo reacciona
  // al texto ya retrasado; la URL actual y cambiar() se leen de una referencia con sus valores más recientes.
  const actual = useRef({ qUrl, cambiar });
  actual.current = { qUrl, cambiar };
  useEffect(() => {
    const texto = qRetrasado.trim();
    if (texto !== actual.current.qUrl) actual.current.cambiar('q', texto);
  }, [qRetrasado]);

  useEffect(() => {
    if (!rangoOk) return undefined;
    let cancelado = false;
    setCargando(true);
    setError(null);
    listarPedidosAdmin({ q: qUrl, estado, desde, hasta })
      .then(({ data }) => {
        if (!cancelado) setPedidos(Array.isArray(data) ? data : []);
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
  }, [qUrl, estado, desde, hasta, rangoOk, version]);

  function limpiar() {
    setQ('');
    setParams({}, { replace: true });
  }

  const hayFiltros = Boolean(qUrl || estado || desde || hasta);

  return (
    <main className="contenedor contenedor--panel">
      <header className="panel__encabezado">
        <h1>Pedidos</h1>
        <p>Todos los pedidos confirmados de los clientes. Abre uno para ver sus productos, el envío y los pagos.</p>
      </header>

      <form className="pedidos-admin-filtros" role="search" aria-label="Buscar pedidos" onSubmit={(e) => e.preventDefault()}>
        <div className="campo pedidos-admin-filtros__busqueda">
          <label className="solo-lector" htmlFor="pedidos-q">
            Buscar por número, cliente o correo
          </label>
          <div className="campo__control">
            <Search size={18} aria-hidden="true" className="campo__icono" />
            <input
              id="pedidos-q"
              type="search"
              className="input input--con-icono"
              placeholder="Número, cliente o correo"
              maxLength={100}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="campo pedidos-admin-filtros__fecha">
          <label className="campo__etiqueta" htmlFor="pedidos-desde">
            Desde
          </label>
          <input id="pedidos-desde" type="date" className="input" value={desde} onChange={(e) => cambiar('desde', e.target.value)} />
        </div>
        <div className="campo pedidos-admin-filtros__fecha">
          <label className="campo__etiqueta" htmlFor="pedidos-hasta">
            Hasta
          </label>
          <input
            id="pedidos-hasta"
            type="date"
            className="input"
            value={hasta}
            aria-invalid={rangoOk ? undefined : 'true'}
            aria-describedby={rangoOk ? undefined : 'pedidos-rango-error'}
            onChange={(e) => cambiar('hasta', e.target.value)}
          />
        </div>
        <Segmentado etiqueta="Estado" opciones={ESTADOS} valor={estado} onElegir={(v) => cambiar('estado', v)} />
      </form>

      {!rangoOk && (
        <p className="campo__error pedidos-admin__rango" id="pedidos-rango-error" role="alert">
          La fecha "desde" no puede ser posterior a "hasta".
        </p>
      )}

      {rangoOk && pedidos === null && cargando && (
        <p className="pedidos-admin__mensaje" role="status">
          Cargando pedidos…
        </p>
      )}

      {rangoOk && error && (
        <div className="pedidos-admin__error">
          <p className="alerta alerta--error" role="alert">
            {error}
          </p>
          <button type="button" className="btn btn--primario" onClick={() => setVersion((v) => v + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {rangoOk && !error && pedidos?.length === 0 && (
        <section className="pedidos-admin__vacio tarjeta">
          <p>{hayFiltros ? 'Ningún pedido coincide con los filtros.' : 'Todavía no hay pedidos.'}</p>
          {hayFiltros && (
            <button type="button" className="btn btn--suave" onClick={limpiar}>
              Quitar filtros
            </button>
          )}
        </section>
      )}

      {rangoOk && !error && pedidos?.length > 0 && (
        <>
          <p className="pedidos-admin__total" role="status">
            {pedidos.length === 1 ? '1 pedido' : `${pedidos.length} pedidos`}
            {pedidos.length >= LIMITE_API && ` · se muestran los ${LIMITE_API} más recientes; usa los filtros para ver otros`}
          </p>
          <div className="pedidos-admin__contenedor" aria-busy={cargando}>
            <table className="pedidos-admin-tabla">
              <caption className="solo-lector">Listado de pedidos</caption>
              <thead>
                <tr>
                  <th scope="col">Pedido</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Unidades</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => {
                  const ep = estadoPedido(pedido.estado);
                  return (
                    <tr key={pedido.id_pedido}>
                      <td data-etiqueta="Pedido">
                        <Link
                          to={`/admin/pedidos/${pedido.numero_pedido}`}
                          state={{ volver: location.search }}
                          className="pedidos-admin-tabla__numero"
                        >
                          {pedido.numero_pedido}
                        </Link>
                      </td>
                      <td data-etiqueta="Cliente">
                        <span className="pedidos-admin-tabla__cliente">
                          <span>{pedido.cliente_nombre}</span>
                          <span className="pedidos-admin-tabla__correo">{pedido.cliente_email}</span>
                        </span>
                      </td>
                      <td data-etiqueta="Fecha">{formatoFechaHora(pedido.fecha_pedido)}</td>
                      <td data-etiqueta="Estado">
                        <span className={`etiqueta etiqueta--${ep.estilo}`}>{ep.texto}</span>
                      </td>
                      <td data-etiqueta="Unidades" className="pedidos-admin-tabla__numero-celda">
                        {pedido.unidades}
                      </td>
                      <td data-etiqueta="Total" className="pedidos-admin-tabla__numero-celda">
                        {formatoCOP(pedido.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

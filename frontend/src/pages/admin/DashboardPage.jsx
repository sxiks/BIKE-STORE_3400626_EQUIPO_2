import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { descargarInforme, obtenerAlertas, obtenerMetricas } from '../../services/dashboard.service';
import { listarCategorias } from '../../services/productos.service';
import FiltrosTablero from '../../components/FiltrosTablero';
import GraficaMasVendidos from '../../components/GraficaMasVendidos';
import AlertasTablero from '../../components/AlertasTablero';
import { formatoCOP } from '../../utils/formato';
import { textoPeriodo } from '../../utils/fechas';
import { guardarArchivo } from '../../utils/descarga';
import '../../assets/panel.css';
import '../../assets/tablero.css';

// Tablero del administrador (F4.1 · CU-16, CU-17) y exportación del informe (F4.2 · CU-18).
// Los filtros aplicados viven en la URL (?desde=&hasta=&categoria=): sobreviven a recargar la página y a volver
// desde un pedido. Métricas y alertas se piden por separado: si una falla, la otra se sigue viendo.
// App.jsx carga esta página aparte (React.lazy): recharts solo se descarga cuando el admin abre el tablero.

const FORMATOS = [
  { formato: 'xlsx', texto: 'Excel', icono: FileSpreadsheet },
  { formato: 'pdf', texto: 'PDF', icono: FileText }
];

// Pide datos a la API cada vez que cambia `clave` (o al reintentar) y descarta respuestas viejas.
// Mientras recarga conserva los datos anteriores, para que la pantalla no parpadee al cambiar un filtro.
function useCarga(pedir, clave) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const [version, setVersion] = useState(0);
  const pedirActual = useRef(pedir);
  pedirActual.current = pedir;

  useEffect(() => {
    let cancelado = false;
    setEstado((prev) => ({ ...prev, cargando: true, error: null }));
    pedirActual.current()
      .then(({ data }) => {
        if (!cancelado) setEstado({ datos: data, cargando: false, error: null });
      })
      .catch((err) => {
        if (!cancelado) setEstado({ datos: null, cargando: false, error: err.message });
      });
    return () => {
      cancelado = true;
    };
  }, [clave, version]);

  const reintentar = useCallback(() => setVersion((v) => v + 1), []);
  return { ...estado, reintentar };
}

function ErrorCarga({ mensaje, onReintentar }) {
  return (
    <div className="tablero__error">
      <p className="alerta alerta--error" role="alert">
        {mensaje}
      </p>
      <button type="button" className="btn btn--primario" onClick={onReintentar}>
        Reintentar
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { mostrar } = useToast();
  const [params, setParams] = useSearchParams();
  const desde = params.get('desde') ?? '';
  const hasta = params.get('hasta') ?? '';
  const categoria = params.get('categoria') ?? '';

  const [categorias, setCategorias] = useState([]);
  const [descargando, setDescargando] = useState(null); // 'xlsx' | 'pdf' | null

  const metricas = useCarga(() => obtenerMetricas({ desde, hasta, categoria }), `${desde}|${hasta}|${categoria}`);
  const alertas = useCarga(obtenerAlertas, 'alertas');

  // Las categorías solo alimentan el filtro: si fallan, el tablero sigue funcionando sin ese filtro.
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

  function aplicar(filtros) {
    const siguientes = new URLSearchParams();
    Object.entries(filtros).forEach(([clave, valor]) => valor && siguientes.set(clave, valor));
    setParams(siguientes);
  }

  async function exportar(formato) {
    setDescargando(formato);
    try {
      const { blob, nombre } = await descargarInforme(formato, { desde, hasta, categoria });
      const archivo = nombre ?? `bike-store-informe.${formato}`;
      guardarArchivo(blob, archivo);
      mostrar(`Informe descargado: ${archivo}`);
    } catch (error) {
      mostrar(error.message);
    } finally {
      setDescargando(null);
    }
  }

  const nombreCategoria = categoria
    ? (categorias.find((c) => String(c.id_categoria) === categoria)?.nombre ?? `Categoría ${categoria}`)
    : 'Todas las categorías';
  const datos = metricas.datos;

  return (
    <main className="contenedor contenedor--panel tablero">
      <header className="panel__encabezado tablero__encabezado">
        <div>
          <h1>Tablero</h1>
          <p>Ventas de los pedidos pagados y alertas del inventario y de los pedidos.</p>
        </div>
        <div className="tablero__exportar" role="group" aria-label="Exportar informe">
          {FORMATOS.map(({ formato, texto, icono: Icono }) => (
            <button
              key={formato}
              type="button"
              className="btn btn--suave"
              disabled={descargando !== null}
              aria-label={`Descargar informe en ${texto}`}
              onClick={() => exportar(formato)}
            >
              <Icono size={18} aria-hidden="true" />
              {descargando === formato ? 'Descargando…' : texto}
            </button>
          ))}
        </div>
      </header>

      <FiltrosTablero aplicados={{ desde, hasta, categoria }} categorias={categorias} onAplicar={aplicar} />

      <section className="tablero__seccion" aria-labelledby="tablero-ventas" aria-busy={metricas.cargando}>
        <div className="tablero__titulo">
          <h2 id="tablero-ventas">Ventas</h2>
          <p data-testid="tablero-filtros-aplicados">
            {textoPeriodo({ desde, hasta })} · {nombreCategoria}
          </p>
        </div>

        {metricas.error && <ErrorCarga mensaje={metricas.error} onReintentar={metricas.reintentar} />}
        {!datos && metricas.cargando && (
          <p className="tablero__mensaje" role="status">
            Cargando las métricas…
          </p>
        )}

        {datos && !metricas.error && (
          <>
            <dl className="tablero-resumen">
              <div className="tablero-resumen__item tarjeta">
                <dt>Ventas totales</dt>
                <dd>{formatoCOP(datos.ventas_totales)}</dd>
              </div>
              <div className="tablero-resumen__item tarjeta">
                <dt>Pedidos pagados</dt>
                <dd>{datos.cantidad_pedidos}</dd>
              </div>
              <div className="tablero-resumen__item tarjeta">
                <dt>Unidades vendidas</dt>
                <dd>{datos.unidades_vendidas}</dd>
              </div>
            </dl>

            <section className="tablero-vendidos tarjeta" aria-labelledby="tablero-vendidos">
              <h3 id="tablero-vendidos">Más vendidos</h3>
              {datos.mas_vendidos.length === 0 ? (
                <p className="tablero__vacio">Sin ventas en el periodo.</p>
              ) : (
                <div className="tablero-vendidos__cuerpo">
                  <GraficaMasVendidos productos={datos.mas_vendidos} />
                  <table className="tablero-vendidos__tabla">
                    <caption className="solo-lector">Los 5 productos más vendidos del periodo</caption>
                    <thead>
                      <tr>
                        <th scope="col">Producto</th>
                        <th scope="col">Unidades</th>
                        <th scope="col">Ventas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.mas_vendidos.map((p) => (
                        <tr key={p.id_producto}>
                          <td>{p.nombre}</td>
                          <td>{p.unidades}</td>
                          <td>{formatoCOP(p.ventas)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </section>

      <section className="tablero__seccion" aria-labelledby="tablero-alertas" aria-busy={alertas.cargando}>
        <div className="tablero__titulo">
          <h2 id="tablero-alertas">Alertas</h2>
          <p>Estado actual del inventario y de los pedidos: no depende de los filtros.</p>
        </div>
        {alertas.error && <ErrorCarga mensaje={alertas.error} onReintentar={alertas.reintentar} />}
        {!alertas.datos && alertas.cargando && (
          <p className="tablero__mensaje" role="status">
            Cargando las alertas…
          </p>
        )}
        {alertas.datos && !alertas.error && <AlertasTablero alertas={alertas.datos} />}
      </section>
    </main>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Truck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { useCarrito } from '../../context/CarritoContext';
import { confirmarCarrito } from '../../services/pedidos.service';
import { formatoCOP } from '../../utils/formato';
import { validarEnvio } from '../../utils/validaciones';
import { DEPARTAMENTOS } from '../../utils/departamentos';
import FormularioPago from '../../components/FormularioPago';
import '../../assets/panel.css';
import '../../assets/checkout.css';

// Checkout (F3.3 · CU-07, CU-08), solo para clientes. Tres pasos:
//   1. Resumen del carrito de la API (si puede_comprar = false, se vuelve al carrito: CU-07).
//   2. Envío → POST /pedidos confirma el carrito: queda vacío en ese momento y nace el pedido 'pendiente'.
//   3. Pago (FormularioPago) → si se aprueba, se va al detalle del pedido (F3.2), que sirve de confirmación.
// Si el cliente sale en el paso 3, su pedido queda pendiente y lo paga desde Mis pedidos.

const PASOS = [
  { id: 'resumen', texto: 'Resumen' },
  { id: 'envio', texto: 'Envío' },
  { id: 'pago', texto: 'Pago' }
];

const MOTIVOS = { INACTIVO: 'ya no está disponible', SIN_STOCK: 'está agotado', SUPERA_STOCK: 'no tiene tantas unidades' };

export default function CheckoutPage() {
  const { user } = useAuth();
  const { mostrar } = useToast();
  const navigate = useNavigate();
  const { cargando, lineas, totalUnidades, totalCompra, puedeComprar, refrescar } = useCarrito();

  const [paso, setPaso] = useState('resumen');
  const [pedido, setPedido] = useState(null); // el pedido 'pendiente' creado al confirmar
  const [aviso, setAviso] = useState(null); // { mensaje, items? } al volver del envío
  const [envio, setEnvio] = useState({
    envio_nombre: user?.nombre ?? '',
    envio_telefono: '',
    envio_departamento: '',
    envio_ciudad: '',
    envio_direccion: ''
  });
  const [tocados, setTocados] = useState({});
  const [errorApi, setErrorApi] = useState('');
  const [enviando, setEnviando] = useState(false);

  const errores = validarEnvio(envio);
  const errorDe = (campo) => (tocados[campo] ? errores[campo] : '');

  function cambiar(event) {
    const { name, value } = event.target;
    setEnvio((prev) => ({ ...prev, [name]: value }));
  }
  const tocar = (event) => setTocados((prev) => ({ ...prev, [event.target.name]: true }));

  async function confirmar(event) {
    event.preventDefault();
    setTocados(Object.fromEntries(Object.keys(envio).map((c) => [c, true])));
    setErrorApi('');
    if (Object.keys(errores).length > 0) return;

    setEnviando(true);
    try {
      const datos = Object.fromEntries(Object.entries(envio).map(([c, v]) => [c, v.trim()]));
      const { data } = await confirmarCarrito(datos);
      setPedido(data);
      setPaso('pago');
      refrescar(); // el carrito quedó vacío: ya es el pedido
    } catch (error) {
      if (error.code === 'CARRITO_NO_DISPONIBLE' || error.code === 'CARRITO_VACIO') {
        // El carrito cambió desde el resumen (otro cliente compró, el admin inactivó...): se vuelve a revisarlo.
        setAviso({ mensaje: error.message, items: error.data?.items ?? [] });
        setPaso('resumen');
        refrescar();
      } else {
        setErrorApi(error.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  function alAprobar(data) {
    mostrar(`¡Pago aprobado! Tu pedido ${data.numero_pedido} está pagado.`);
    navigate(`/cuenta/pedidos/${data.numero_pedido}`, { replace: true, state: { pagado: true } });
  }

  const indicePaso = PASOS.findIndex((p) => p.id === paso);

  return (
    <main className="contenedor checkout">
      <header className="panel__encabezado">
        <h1>Finalizar compra</h1>
        <ol className="checkout__pasos" aria-label="Pasos de la compra">
          {PASOS.map((p, i) => (
            <li
              key={p.id}
              className={`checkout__paso${i === indicePaso ? ' checkout__paso--actual' : ''}${i < indicePaso ? ' checkout__paso--hecho' : ''}`}
              aria-current={i === indicePaso ? 'step' : undefined}
            >
              <span className="checkout__paso-numero" aria-hidden="true">
                {i + 1}
              </span>
              {p.texto}
            </li>
          ))}
        </ol>
      </header>

      {/* ---------- Paso 1: resumen ---------- */}
      {paso === 'resumen' && (
        <>
          {aviso && (
            <div className="alerta alerta--aviso" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                {aviso.mensaje}
                {aviso.items?.length > 0 && (
                  <ul className="pago__items">
                    {aviso.items.map((i) => (
                      <li key={i.id_producto}>
                        {i.nombre}: {MOTIVOS[i.motivo] ?? 'no está disponible'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

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
                  Hay productos de tu carrito que no se pueden comprar. Vuelve a la tienda, abre tu carrito y revísalos.
                </p>
              )}
              <Resumen lineas={lineas} totalUnidades={totalUnidades} totalCompra={totalCompra} />
              <div className="checkout__acciones">
                <Link to="/" className="btn btn--suave">
                  <ArrowLeft size={18} aria-hidden="true" />
                  Seguir comprando
                </Link>
                <button type="button" className="btn btn--primario" disabled={!puedeComprar} onClick={() => setPaso('envio')}>
                  <Truck size={18} aria-hidden="true" />
                  Continuar con el envío
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ---------- Paso 2: envío ---------- */}
      {paso === 'envio' && (
        <form className="envio tarjeta" onSubmit={confirmar} noValidate aria-label="Datos de envío">
          <h2>¿A dónde enviamos tu pedido?</h2>
          {errorApi && (
            <p className="alerta alerta--error" role="alert">
              {errorApi}
            </p>
          )}

          <div className="envio__rejilla">
            <CampoEnvio id="envio_nombre" etiqueta="Nombre de quien recibe" error={errorDe('envio_nombre')}>
              {(props) => <input {...props} className="input" autoComplete="name" value={envio.envio_nombre} onChange={cambiar} onBlur={tocar} />}
            </CampoEnvio>
            <CampoEnvio id="envio_telefono" etiqueta="Teléfono" error={errorDe('envio_telefono')}>
              {(props) => (
                <input {...props} className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="Ej.: 300 123 4567" value={envio.envio_telefono} onChange={cambiar} onBlur={tocar} />
              )}
            </CampoEnvio>
            <CampoEnvio id="envio_departamento" etiqueta="Departamento" error={errorDe('envio_departamento')}>
              {(props) => (
                <select {...props} className="input" value={envio.envio_departamento} onChange={cambiar} onBlur={tocar}>
                  <option value="">Selecciona el departamento</option>
                  {DEPARTAMENTOS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </CampoEnvio>
            <CampoEnvio id="envio_ciudad" etiqueta="Ciudad o municipio" error={errorDe('envio_ciudad')}>
              {(props) => <input {...props} className="input" autoComplete="address-level2" value={envio.envio_ciudad} onChange={cambiar} onBlur={tocar} />}
            </CampoEnvio>
            <CampoEnvio id="envio_direccion" etiqueta="Dirección" error={errorDe('envio_direccion')} ancho>
              {(props) => (
                <input {...props} className="input" autoComplete="street-address" placeholder="Ej.: Calle 30 # 28-15, apto 201" value={envio.envio_direccion} onChange={cambiar} onBlur={tocar} />
              )}
            </CampoEnvio>
          </div>

          <p className="envio__nota">
            Al continuar se crea tu pedido con el precio actual de cada producto y tu carrito queda vacío. Si no terminas el
            pago, podrás hacerlo desde Mis pedidos.
          </p>
          <div className="checkout__acciones">
            <button type="button" className="btn btn--suave" onClick={() => setPaso('resumen')}>
              <ArrowLeft size={18} aria-hidden="true" />
              Volver al resumen
            </button>
            <button type="submit" className="btn btn--primario" disabled={enviando}>
              {enviando ? 'Creando tu pedido…' : 'Continuar al pago'}
            </button>
          </div>
        </form>
      )}

      {/* ---------- Paso 3: pago ---------- */}
      {paso === 'pago' && pedido && (
        <>
          <section className="checkout__pedido tarjeta" aria-labelledby="checkout-pedido">
            <h2 id="checkout-pedido">Pedido {pedido.numero_pedido}</h2>
            <p>
              Total a pagar: <strong>{formatoCOP(pedido.total)}</strong>. Tu pedido quedó reservado; si sales ahora, puedes
              pagarlo desde <Link to="/cuenta/pedidos">Mis pedidos</Link>.
            </p>
          </section>
          <FormularioPago
            pedido={pedido}
            onAprobado={alAprobar}
            onYaPagado={() => navigate(`/cuenta/pedidos/${pedido.numero_pedido}`, { replace: true })}
          />
        </>
      )}
    </main>
  );
}

function Resumen({ lineas, totalUnidades, totalCompra }) {
  return (
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
  );
}

// Etiqueta + control + error con los atributos de accesibilidad conectados (mismo patrón que ProductoFormPage).
function CampoEnvio({ id, etiqueta, error, ancho = false, children }) {
  const idError = `${id}-error`;
  return (
    <div className={`campo${ancho ? ' envio__ancho' : ''}`}>
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      {children({ id, name: id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? idError : undefined })}
      {error && (
        <p className="campo__error" id={idError}>
          {error}
        </p>
      )}
    </div>
  );
}

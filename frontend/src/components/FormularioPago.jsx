import { useState } from 'react';
import { AlertCircle, CreditCard, Lock, XCircle } from 'lucide-react';
import { pagarPedido } from '../services/pedidos.service';
import { formatoCOP } from '../utils/formato';
import { MEDIOS_PAGO, digitosPago, enmascararNumero, validarPago } from '../utils/validaciones';
import '../assets/checkout.css';

// Paso de pago (F3.3 · CU-08): lo usan el checkout y "Pagar" de un pedido existente (/cuenta/pedidos/:numero/pagar).
//   pedido: { id_pedido, numero_pedido, total } · onAprobado(data) · onYaPagado()
// Seguridad (R5): el número completo SOLO vive en el estado local de este formulario. No va al contexto, ni a
// localStorage, ni a la consola, y se borra después de cada intento. El backend guarda solo los últimos 4.
// Resultados (contrato "Pedidos y pago"): 402 rechazado → se puede reintentar (decisión F); 409 SIN_STOCK → no se
// cobró nada (decisión E); 409 PEDIDO_YA_PAGADO → onYaPagado.
export default function FormularioPago({ pedido, onAprobado, onYaPagado }) {
  const [medio, setMedio] = useState('tarjeta_credito');
  const [numero, setNumero] = useState('');
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo: 'rechazado' | 'sin_stock' | 'error', mensaje, items? }

  const errores = validarPago({ medio_pago: medio, numero });
  const errorNumero = tocado ? errores.numero : '';
  const esCuenta = medio === 'cuenta_bancaria';
  const listo = Object.keys(errores).length === 0;

  async function pagar(event) {
    event.preventDefault();
    setTocado(true);
    if (!listo) return;

    setEnviando(true);
    setResultado(null);
    try {
      const { data } = await pagarPedido(pedido.id_pedido, { medio_pago: medio, numero: digitosPago(numero) });
      onAprobado(data);
    } catch (error) {
      if (error.code === 'PEDIDO_YA_PAGADO') {
        onYaPagado?.();
        return;
      }
      if (error.code === 'PAGO_RECHAZADO') {
        setResultado({ tipo: 'rechazado', mensaje: error.message });
      } else if (error.code === 'SIN_STOCK') {
        setResultado({ tipo: 'sin_stock', mensaje: error.message, items: error.data?.items ?? [] });
      } else {
        setResultado({ tipo: 'error', mensaje: error.message });
      }
    } finally {
      // El número nunca se conserva entre intentos.
      setNumero('');
      setTocado(false);
      setEnviando(false);
    }
  }

  return (
    <form className="pago tarjeta" onSubmit={pagar} noValidate aria-label="Pagar el pedido">
      <div className="pago__encabezado">
        <h2>Pago</h2>
        <span className="pago__seguro">
          <Lock size={14} aria-hidden="true" /> Pago simulado: no se cobra nada real
        </span>
      </div>

      {resultado?.tipo === 'rechazado' && (
        <div className="alerta alerta--error pago__resultado" role="alert">
          <XCircle size={18} aria-hidden="true" />
          <div>
            <strong>El pago fue rechazado.</strong> Puedes intentarlo de nuevo con otro medio de pago o con otro número: se
            cobra sobre el mismo pedido.
          </div>
        </div>
      )}
      {resultado?.tipo === 'sin_stock' && (
        <div className="alerta alerta--aviso pago__resultado" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>No se cobró nada.</strong> {resultado.mensaje}:
            <ul className="pago__items">
              {resultado.items.map((item) => (
                <li key={item.id_producto}>
                  {item.nombre}
                  {item.motivo === 'INACTIVO'
                    ? ': ya no está disponible'
                    : `: quedan ${item.disponibles ?? 0} ${item.disponibles === 1 ? 'unidad' : 'unidades'}`}
                </li>
              ))}
            </ul>
            Tu pedido sigue pendiente: puedes pagarlo desde Mis pedidos cuando haya existencias.
          </div>
        </div>
      )}
      {resultado?.tipo === 'error' && (
        <p className="alerta alerta--error pago__resultado" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {resultado.mensaje}
        </p>
      )}

      <fieldset className="pago__medios">
        <legend className="campo__etiqueta">Medio de pago</legend>
        {MEDIOS_PAGO.map((m) => (
          <label key={m.valor} className={`pago__medio${medio === m.valor ? ' pago__medio--activo' : ''}`}>
            <input
              type="radio"
              name="medio_pago"
              value={m.valor}
              checked={medio === m.valor}
              onChange={() => {
                setMedio(m.valor);
                setNumero('');
                setTocado(false);
              }}
            />
            {m.texto}
          </label>
        ))}
      </fieldset>

      <div className="campo">
        <label className="campo__etiqueta" htmlFor="pago-numero">
          {esCuenta ? 'Número de la cuenta' : 'Número de la tarjeta'}
        </label>
        <div className="campo__control">
          <CreditCard size={18} aria-hidden="true" className="campo__icono" />
          <input
            id="pago-numero"
            className="input input--con-icono"
            inputMode="numeric"
            autoComplete={esCuenta ? 'off' : 'cc-number'}
            placeholder={esCuenta ? 'Entre 6 y 20 dígitos' : 'Entre 13 y 19 dígitos'}
            value={numero}
            onChange={(e) => setNumero(e.target.value.replace(/[^\d\s-]/g, ''))}
            onBlur={() => setTocado(true)}
            aria-invalid={Boolean(errorNumero)}
            aria-describedby={`pago-numero-ayuda${errorNumero ? ' pago-numero-error' : ''}`}
          />
        </div>
        <p className="pago__ayuda" id="pago-numero-ayuda">
          Para probar un rechazo, usa un número que termine en 0000.
        </p>
        {errorNumero && (
          <p className="campo__error" id="pago-numero-error">
            {errorNumero}
          </p>
        )}
      </div>

      <button type="submit" className="btn btn--primario btn--bloque" disabled={enviando}>
        <Lock size={18} aria-hidden="true" />
        {enviando
          ? 'Procesando el pago…'
          : listo
            ? `Pagar ${formatoCOP(pedido.total)} con ${enmascararNumero(numero)}`
            : `Pagar ${formatoCOP(pedido.total)}`}
      </button>
    </form>
  );
}

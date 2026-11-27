import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, KeyRound, Mail, Send, Wrench } from 'lucide-react';
import { recuperar } from '../services/auth.service';
import { errorEmail } from '../utils/validaciones';

// CU-11 · D8, paso 1: pedir el enlace de recuperación. El backend responde lo mismo exista o no
// el correo, y ese message se muestra siempre en la página y no en un toast: es la respuesta
// principal y el usuario la necesita a la vista mientras revisa su correo.
export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [tocado, setTocado] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null); // { message, tokenDesarrollo }
  const [submitting, setSubmitting] = useState(false);

  const errorCampo = tocado ? errorEmail(email) : null;

  async function submit(event) {
    event.preventDefault();
    setTocado(true);
    setError('');
    if (errorEmail(email)) return;

    setSubmitting(true);
    try {
      const respuesta = await recuperar(email.trim());
      setResultado({
        message: respuesta.message,
        // Doble barrera: el backend solo lo envía en desarrollo y el frontend solo lo muestra en DEV.
        tokenDesarrollo: import.meta.env.DEV ? (respuesta.data?.token_desarrollo ?? null) : null
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth__tarjeta tarjeta" onSubmit={submit} noValidate>
        <div className="auth__logo">
          <KeyRound size={28} aria-hidden="true" />
        </div>

        <div className="auth__encabezado">
          <h1>BIKE STORE</h1>
          <h2>Recuperar contraseña</h2>
        </div>

        <p className="auth__texto">
          Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
        </p>

        {error && (
          <p className="alerta alerta--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {error}
          </p>
        )}

        {resultado && (
          <p className="alerta alerta--exito" role="status" data-testid="respuesta-recuperar">
            <CheckCircle size={18} aria-hidden="true" />
            {resultado.message}
          </p>
        )}

        {resultado?.tokenDesarrollo && (
          <div className="alerta alerta--aviso" data-testid="aviso-desarrollo">
            <Wrench size={18} aria-hidden="true" />
            <div>
              <strong>Modo desarrollo.</strong> No hay envío de correos todavía; usa este enlace:{' '}
              <Link to={`/restablecer?token=${encodeURIComponent(resultado.tokenDesarrollo)}`}>
                Restablecer contraseña
              </Link>
            </div>
          </div>
        )}

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="recuperar-email">Correo</label>
          <div className="campo__control">
            <Mail size={18} className="campo__icono" aria-hidden="true" />
            <input
              id="recuperar-email"
              name="email"
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTocado(true)}
              autoComplete="email"
              className="input input--con-icono"
              aria-invalid={Boolean(errorCampo)}
              aria-describedby={errorCampo ? 'recuperar-email-error' : undefined}
            />
          </div>
          {errorCampo && <p className="campo__error" id="recuperar-email-error">{errorCampo}</p>}
        </div>

        <button type="submit" className="btn btn--primario btn--bloque" disabled={submitting}>
          <Send size={18} aria-hidden="true" />
          {submitting ? 'Enviando...' : 'Enviar enlace'}
        </button>

        <p className="auth__pie"><Link to="/login">Volver a iniciar sesión</Link></p>
      </form>
    </main>
  );
}

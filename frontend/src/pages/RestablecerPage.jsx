import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, Save } from 'lucide-react';
import { restablecer } from '../services/auth.service';
import { useToast } from '../context/ToastContext';
import { validarRestablecer } from '../utils/validaciones';
import ReglasPassword from '../components/ReglasPassword';

const MSG_SIN_TOKEN = 'El enlace de recuperación no es válido o ya venció';

// CU-11 · D8, paso 2: crear la contraseña nueva con el token del enlace (?token=...).
export default function RestablecerPage() {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [form, setForm] = useState({ password: '', confirmacion: '' });
  const [tocados, setTocados] = useState({});
  // tokenInvalido: el enlace ya no sirve; se cambia el formulario por un enlace a /recuperar.
  const [errorApi, setErrorApi] = useState({ mensaje: '', tokenInvalido: false });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const errores = validarRestablecer(form);
  const errorCampo = (campo) => (tocados[campo] && errores[campo]) || '';

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function blur(event) {
    setTocados({ ...tocados, [event.target.name]: true });
  }

  async function submit(event) {
    event.preventDefault();
    setTocados({ password: true, confirmacion: true });
    setErrorApi({ mensaje: '', tokenInvalido: false });
    if (Object.keys(errores).length > 0) return;

    setSubmitting(true);
    try {
      const respuesta = await restablecer(token, form.password);
      mostrar(respuesta.message);
      navigate('/login');
    } catch (err) {
      setErrorApi({ mensaje: err.message, tokenInvalido: err.code === 'TOKEN_INVALIDO' });
      setSubmitting(false);
    }
  }

  // Sin token en la URL o con el token rechazado por la API: no tiene sentido mostrar el formulario.
  if (!token || errorApi.tokenInvalido) {
    return (
      <main className="auth">
        <section className="auth__tarjeta tarjeta">
          <div className="auth__logo">
            <KeyRound size={28} aria-hidden="true" />
          </div>
          <div className="auth__encabezado">
            <h1>BIKE STORE</h1>
            <h2>Restablecer contraseña</h2>
          </div>
          <p className="alerta alerta--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {errorApi.mensaje || MSG_SIN_TOKEN}
          </p>
          <Link to="/recuperar" className="btn btn--primario btn--bloque">
            Solicitar un enlace nuevo
          </Link>
        </section>
      </main>
    );
  }

  const errorPassword = errorCampo('password');
  const errorConfirmacion = errorCampo('confirmacion');

  return (
    <main className="auth">
      <form className="auth__tarjeta tarjeta" onSubmit={submit} noValidate>
        <div className="auth__logo">
          <KeyRound size={28} aria-hidden="true" />
        </div>

        <div className="auth__encabezado">
          <h1>BIKE STORE</h1>
          <h2>Restablecer contraseña</h2>
        </div>

        {errorApi.mensaje && (
          <p className="alerta alerta--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {errorApi.mensaje}
          </p>
        )}

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="restablecer-password">Contraseña nueva</label>
          <div className="campo__control">
            <Lock size={18} className="campo__icono" aria-hidden="true" />
            <input
              id="restablecer-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña nueva"
              value={form.password}
              onChange={change}
              onBlur={blur}
              autoComplete="new-password"
              className="input input--con-icono input--con-accion"
              aria-invalid={Boolean(errorPassword)}
              aria-describedby={`restablecer-password-reglas${errorPassword ? ' restablecer-password-error' : ''}`}
            />
            <button
              type="button"
              className="campo__accion"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          <ReglasPassword password={form.password} id="restablecer-password-reglas" />
          {errorPassword && <p className="campo__error" id="restablecer-password-error">{errorPassword}</p>}
        </div>

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="restablecer-confirmacion">Repite la contraseña</label>
          <div className="campo__control">
            <Lock size={18} className="campo__icono" aria-hidden="true" />
            <input
              id="restablecer-confirmacion"
              name="confirmacion"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repite la contraseña"
              value={form.confirmacion}
              onChange={change}
              onBlur={blur}
              autoComplete="new-password"
              className="input input--con-icono"
              aria-invalid={Boolean(errorConfirmacion)}
              aria-describedby={errorConfirmacion ? 'restablecer-confirmacion-error' : undefined}
            />
          </div>
          {errorConfirmacion && (
            <p className="campo__error" id="restablecer-confirmacion-error">{errorConfirmacion}</p>
          )}
        </div>

        <button type="submit" className="btn btn--primario btn--bloque" disabled={submitting}>
          <Save size={18} aria-hidden="true" />
          {submitting ? 'Guardando...' : 'Guardar contraseña'}
        </button>

        <p className="auth__pie"><Link to="/login">Volver a iniciar sesión</Link></p>
      </form>
    </main>
  );
}

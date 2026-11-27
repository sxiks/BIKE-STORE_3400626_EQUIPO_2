import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, Mail, Mountain, UserPlus } from 'lucide-react';
import { register } from '../services/auth.service';
import { useToast } from '../context/ToastContext';
import { validarRegistro } from '../utils/validaciones';
import ReglasPassword from '../components/ReglasPassword';

// CU-09. Valida en el formulario (correo y D7) antes de llamar a la API; los errores del
// backend se siguen mostrando: 409 junto al correo, el resto arriba del formulario.
export default function RegisterPage() {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  // Campos que el usuario ya visitó: sus errores se muestran desde ese momento.
  const [tocados, setTocados] = useState({});
  const [errorApi, setErrorApi] = useState({ campo: null, mensaje: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const errores = validarRegistro(form);
  const errorCampo = (campo) =>
    (tocados[campo] && errores[campo]) || (errorApi.campo === campo ? errorApi.mensaje : '');

  function change(event) {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
    if (errorApi.campo === name) setErrorApi({ campo: null, mensaje: '' });
  }

  function blur(event) {
    setTocados({ ...tocados, [event.target.name]: true });
  }

  async function submit(event) {
    event.preventDefault();
    setTocados({ nombre: true, email: true, password: true });
    setErrorApi({ campo: null, mensaje: '' });
    if (Object.keys(errores).length > 0) return;

    setSubmitting(true);
    try {
      await register({ ...form, nombre: form.nombre.trim(), email: form.email.trim() });
      mostrar('Cuenta creada. Ya puedes iniciar sesión');
      navigate('/login');
    } catch (err) {
      setErrorApi({ campo: err.status === 409 ? 'email' : null, mensaje: err.message });
      setSubmitting(false);
    }
  }

  const errorNombre = errorCampo('nombre');
  const errorEmail = errorCampo('email');
  const errorPassword = errorCampo('password');

  return (
    <main className="auth">
      <form className="auth__tarjeta tarjeta" onSubmit={submit} noValidate>
        <div className="auth__logo">
          <Mountain size={28} aria-hidden="true" />
        </div>

        <div className="auth__encabezado">
          <h1>BIKE STORE</h1>
          <h2>Crear usuario</h2>
        </div>

        {errorApi.mensaje && !errorApi.campo && (
          <p className="alerta alerta--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {errorApi.mensaje}
          </p>
        )}

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="registro-nombre">Nombre</label>
          <input
            id="registro-nombre"
            name="nombre"
            placeholder="Nombre"
            value={form.nombre}
            onChange={change}
            onBlur={blur}
            autoComplete="name"
            className="input"
            aria-invalid={Boolean(errorNombre)}
            aria-describedby={errorNombre ? 'registro-nombre-error' : undefined}
          />
          {errorNombre && <p className="campo__error" id="registro-nombre-error">{errorNombre}</p>}
        </div>

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="registro-email">Correo</label>
          <div className="campo__control">
            <Mail size={18} className="campo__icono" aria-hidden="true" />
            <input
              id="registro-email"
              name="email"
              type="email"
              placeholder="Correo"
              value={form.email}
              onChange={change}
              onBlur={blur}
              autoComplete="email"
              className="input input--con-icono"
              aria-invalid={Boolean(errorEmail)}
              aria-describedby={errorEmail ? 'registro-email-error' : undefined}
            />
          </div>
          {errorEmail && <p className="campo__error" id="registro-email-error">{errorEmail}</p>}
        </div>

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="registro-password">Contraseña</label>
          <div className="campo__control">
            <Lock size={18} className="campo__icono" aria-hidden="true" />
            <input
              id="registro-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={form.password}
              onChange={change}
              onBlur={blur}
              autoComplete="new-password"
              className="input input--con-icono input--con-accion"
              aria-invalid={Boolean(errorPassword)}
              aria-describedby={`registro-password-reglas${errorPassword ? ' registro-password-error' : ''}`}
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
          <ReglasPassword password={form.password} id="registro-password-reglas" />
          {errorPassword && <p className="campo__error" id="registro-password-error">{errorPassword}</p>}
        </div>

        <button type="submit" className="btn btn--primario btn--bloque" disabled={submitting}>
          <UserPlus size={18} aria-hidden="true" />
          {submitting ? 'Registrando...' : 'Registrarme'}
        </button>
        <p className="auth__pie">¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link></p>
      </form>
    </main>
  );
}

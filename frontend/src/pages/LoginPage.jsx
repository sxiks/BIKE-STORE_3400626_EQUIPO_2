import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, Mountain } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Ruta a la que se vuelve después de iniciar sesión: la que ProtectedRoute guardó en el estado
// de la navegación (F1.2), o la tienda. Solo se aceptan rutas internas.
function rutaDestino(location) {
  const desde = location.state?.from;
  const ruta = desde ? `${desde.pathname}${desde.search ?? ''}` : '/';
  return ruta.startsWith('/') && !ruta.startsWith('/login') ? ruta : '/';
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Con sesión (ya iniciada o recién iniciada) se va al destino. Un solo punto de redirección.
  if (isAuthenticated) return <Navigate to={rutaDestino(location)} replace />;

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(form); // al cambiar la sesión, el componente se vuelve a pintar y redirige
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth__tarjeta tarjeta" onSubmit={submit}>
        <div className="auth__logo">
          <Mountain size={28} aria-hidden="true" />
        </div>

        <div className="auth__encabezado">
          <h1>BIKE STORE</h1>
          <h2>Inicia sesión para continuar</h2>
        </div>

        {error && (
          <p className="alerta alerta--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="login-email">Correo</label>
          <div className="campo__control">
            <Mail size={18} className="campo__icono" aria-hidden="true" />
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="Correo"
              value={form.email}
              onChange={change}
              autoComplete="username"
              className="input input--con-icono"
              required
            />
          </div>
        </div>

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="login-password">Contraseña</label>
          <div className="campo__control">
            <Lock size={18} className="campo__icono" aria-hidden="true" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={form.password}
              onChange={change}
              autoComplete="current-password"
              className="input input--con-icono input--con-accion"
              required
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
        </div>

        <button type="submit" className="btn btn--primario btn--bloque" disabled={submitting}>
          <LogIn size={18} aria-hidden="true" />
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>

        <p className="auth__pie">¿No tienes cuenta? <Link to="/registro">Registrarme</Link></p>
      </form>
    </main>
  );
}

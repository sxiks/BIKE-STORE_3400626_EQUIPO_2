import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AlertCircle, Bike, Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
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
    <main className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <div className="auth-logo">
          <Bike size={26} aria-hidden="true" />
        </div>

        <h1>BIKE STORE</h1>
        <h2>Inicia sesión para continuar</h2>

        {error && <p className="error"><AlertCircle size={16} />{error}</p>}

        <div className="field">
          <Mail size={16} />
          <input
            name="email"
            type="email"
            placeholder="Correo"
            value={form.email}
            onChange={change}
            autoComplete="username"
            required
          />
        </div>

        <div className="field">
          <Lock size={16} />
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Contraseña"
            value={form.password}
            onChange={change}
            autoComplete="current-password"
            className="has-toggle"
            required
          />
          <button
            type="button"
            className="toggle-visibility"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <button type="submit" disabled={submitting}>
          <LogIn size={16} />
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>

        <p>¿No tienes cuenta? <Link to="/registro">Registrarme</Link></p>
      </form>
    </main>
  );
}

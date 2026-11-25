import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Bike, Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
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

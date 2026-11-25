import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, Mail, Mountain, UserPlus } from 'lucide-react';
import { register } from '../services/auth.service';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    try {
      await register(form);
      navigate('/login');
    } catch (err) {
      setError(err.message);
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
          <h2>Crear usuario</h2>
        </div>

        {error && (
          <p className="alerta alerta--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {error}
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
            autoComplete="name"
            className="input"
            required
          />
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
              autoComplete="email"
              className="input input--con-icono"
              required
            />
          </div>
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
              autoComplete="new-password"
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

        <button type="submit" className="btn btn--primario btn--bloque">
          <UserPlus size={18} aria-hidden="true" />
          Registrarme
        </button>
        <p className="auth__pie">¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link></p>
      </form>
    </main>
  );
}

import { Link } from 'react-router-dom';
import { LayoutDashboard, LogIn, LogOut, Mountain, ShoppingBag, UserPlus, UserRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import BotonTema from './BotonTema';
import '../assets/navbar.css';

// Barra de navegación única de la aplicación (F1.1).
// `carrito` es opcional: solo la tienda lo pasa ({ totalUnidades, onAbrir }), porque solo allí existe el carrito.
// El ícono del carrito va siempre al final (a la derecha), como piden las pruebas del instructor.
export default function Navbar({ carrito = null }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { mostrar } = useToast();

  function cerrarSesion() {
    logout();
    mostrar('Cerraste sesión');
  }

  return (
    <header className="nav-principal">
      <nav className="nav-principal__inner" aria-label="Principal">
        <Link to="/" className="nav-principal__marca">
          <Mountain size={28} aria-hidden="true" />
          BIKE STORE
        </Link>

        <div className="nav-principal__sesion">
          {isAuthenticated ? (
            <>
              {/* Acceso a la sección de cada rol (F1.2). Ocultarlo no es seguridad: el backend valida el rol. */}
              {isAdmin ? (
                <Link to="/admin" className="nav-principal__boton">
                  <LayoutDashboard size={16} aria-hidden="true" />
                  Administración
                </Link>
              ) : (
                <Link to="/cuenta" className="nav-principal__boton">
                  <UserRound size={16} aria-hidden="true" />
                  Mi cuenta
                </Link>
              )}
              <span className="nav-principal__usuario" data-testid="usuario-sesion">
                {user?.nombre}
                <span className={`nav-principal__rol nav-principal__rol--${user?.rol}`}>{user?.rol}</span>
              </span>
              <button type="button" className="nav-principal__boton" onClick={cerrarSesion}>
                <LogOut size={16} aria-hidden="true" />
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-principal__boton">
                <LogIn size={16} aria-hidden="true" />
                Iniciar sesión
              </Link>
              <Link to="/registro" className="nav-principal__boton nav-principal__boton--resaltado">
                <UserPlus size={16} aria-hidden="true" />
                Registrarme
              </Link>
            </>
          )}
        </div>

        {/* Tema claro u oscuro (rediseño). Antes del carrito: el carrito sigue siendo el último a la derecha. */}
        <BotonTema />

        {carrito && (
          <button
            type="button"
            className="nav-principal__carrito"
            aria-label={`Abrir carrito (${carrito.totalUnidades} unidades)`}
            onClick={carrito.onAbrir}
          >
            <ShoppingBag size={22} aria-hidden="true" />
            {carrito.totalUnidades > 0 && (
              <span className="nav-principal__contador" data-testid="contador-carrito">
                {carrito.totalUnidades}
              </span>
            )}
          </button>
        )}
      </nav>
    </header>
  );
}

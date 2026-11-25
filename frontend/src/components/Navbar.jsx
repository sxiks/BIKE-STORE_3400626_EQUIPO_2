import { Link } from 'react-router-dom';
import { Bike, LogIn, LogOut, ShoppingCart, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import '../assets/navbar.css';

// Barra de navegación única de la aplicación (F1.1).
// `carrito` es opcional: solo la tienda lo pasa ({ totalUnidades, onAbrir }), porque solo allí existe el carrito.
// El ícono del carrito va siempre al final (a la derecha), como piden las pruebas del instructor.
export default function Navbar({ carrito = null }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { mostrar } = useToast();

  function cerrarSesion() {
    logout();
    mostrar('Cerraste sesión');
  }

  return (
    <header className="nav-principal">
      <nav className="nav-principal__inner" aria-label="Principal">
        <Link to="/" className="nav-principal__marca">
          <Bike size={24} aria-hidden="true" />
          BIKE STORE
        </Link>

        <div className="nav-principal__sesion">
          {isAuthenticated ? (
            <>
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

        {carrito && (
          <button
            type="button"
            className="nav-principal__carrito"
            aria-label={`Abrir carrito (${carrito.totalUnidades} unidades)`}
            onClick={carrito.onAbrir}
          >
            <ShoppingCart size={26} aria-hidden="true" />
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

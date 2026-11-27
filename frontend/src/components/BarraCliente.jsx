import { Link, NavLink } from 'react-router-dom';
import { Bike, LogIn, LogOut, Search, ShoppingBag, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import BotonTema from './BotonTema';
import '../assets/barra-cliente.css';

// Barra superior del cliente y de las páginas públicas (rediseño, estructura de la opción A).
// El administrador no la ve: SinAdmin lo lleva a /admin, donde usa BarraAdmin.
// Props opcionales, solo las pasa la tienda:
//   carrito:  { totalUnidades, onAbrir } → botón del carrito, siempre el último a la derecha (pruebas del instructor)
//   busqueda: { valor, onCambiar }      → campo de búsqueda del catálogo
export default function BarraCliente({ carrito = null, busqueda = null }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { mostrar } = useToast();

  function cerrarSesion() {
    logout();
    mostrar('Cerraste sesión');
  }

  const claseEnlace = ({ isActive }) => `barra-cliente__enlace${isActive ? ' barra-cliente__enlace--activo' : ''}`;

  return (
    <header className="barra-cliente">
      <nav className="barra-cliente__inner" aria-label="Principal">
        <Link to="/" className="barra-cliente__marca">
          <span className="barra-cliente__logo" aria-hidden="true">
            <Bike size={18} />
          </span>
          BIKE STORE
        </Link>

        <div className="barra-cliente__enlaces">
          <NavLink to="/" end className={claseEnlace}>
            Tienda
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/cuenta" className={claseEnlace}>
              Mi cuenta
            </NavLink>
          )}
        </div>

        {busqueda && (
          <div className="barra-cliente__busqueda" role="search">
            <label htmlFor="buscar-productos" className="solo-lector">
              Buscar productos
            </label>
            <Search size={16} aria-hidden="true" className="barra-cliente__busqueda-icono" />
            <input
              id="buscar-productos"
              type="search"
              className="input input--con-icono barra-cliente__busqueda-input"
              placeholder="Buscar productos…"
              value={busqueda.valor}
              onChange={(e) => busqueda.onCambiar(e.target.value)}
            />
          </div>
        )}

        <div className="barra-cliente__acciones">
          {isAuthenticated ? (
            <>
              <span className="barra-cliente__usuario" data-testid="usuario-sesion">
                <span className="barra-cliente__avatar" aria-hidden="true">
                  {iniciales(user?.nombre)}
                </span>
                <span className="barra-cliente__usuario-texto">
                  <span className="barra-cliente__nombre">{user?.nombre}</span>
                  <span className="barra-cliente__rol">{user?.rol}</span>
                </span>
              </span>
              <button type="button" className="barra-cliente__boton" onClick={cerrarSesion}>
                <LogOut size={16} aria-hidden="true" />
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="barra-cliente__boton">
                <LogIn size={16} aria-hidden="true" />
                Iniciar sesión
              </Link>
              <Link to="/registro" className="barra-cliente__boton barra-cliente__boton--resaltado">
                <UserPlus size={16} aria-hidden="true" />
                Registrarme
              </Link>
            </>
          )}
          <BotonTema />
        </div>

        {carrito && (
          <button
            type="button"
            className="barra-cliente__carrito"
            aria-label={`Abrir carrito (${carrito.totalUnidades} unidades)`}
            onClick={carrito.onAbrir}
          >
            <ShoppingBag size={18} aria-hidden="true" />
            <span className="barra-cliente__carrito-texto">Carrito</span>
            {carrito.totalUnidades > 0 && (
              <span className="barra-cliente__contador" data-testid="contador-carrito">
                {carrito.totalUnidades}
              </span>
            )}
          </button>
        )}
      </nav>
    </header>
  );
}

// "Ana Cliente" → "AC"
export function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}

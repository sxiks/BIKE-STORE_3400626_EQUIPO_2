import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bike, ChartColumn, House, LogOut, Menu, Package, ReceiptText, Users, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import BotonTema from './BotonTema';
import { iniciales } from './BarraCliente';
import '../assets/barra-admin.css';

// Secciones del panel. Las que tienen `ruta` ya existen; las demás muestran el sprint en que llegan.
const SECCIONES = [
  { nombre: 'Inicio', icono: House, ruta: '/admin', exacta: true },
  { nombre: 'Usuarios', icono: Users, ruta: '/admin/usuarios' },
  { nombre: 'Productos', icono: Package, ruta: '/admin/productos' },
  { nombre: 'Pedidos', icono: ReceiptText, sprint: 'Sprint 3' },
  { nombre: 'Tablero', icono: ChartColumn, sprint: 'Sprint 4' }
];

// Barra lateral del administrador (rediseño · estructura B). Sin enlace a la tienda: el admin solo ve su panel.
// En pantallas angostas se convierte en una barra superior con un botón que despliega el menú.
export default function BarraAdmin() {
  const { user, logout } = useAuth();
  const { mostrar } = useToast();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Al navegar, el menú desplegable se cierra.
  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  function cerrarSesion() {
    logout();
    mostrar('Cerraste sesión');
  }

  return (
    <aside className={`barra-admin${menuAbierto ? ' barra-admin--abierta' : ''}`}>
      <div className="barra-admin__cabecera">
        <span className="barra-admin__marca">
          <span className="barra-admin__logo" aria-hidden="true">
            <Bike size={18} />
          </span>
          BIKE STORE
        </span>
        <button
          type="button"
          className="icono-btn barra-admin__menu"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="barra-admin-navegacion"
          onClick={() => setMenuAbierto((v) => !v)}
        >
          {menuAbierto ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      <div id="barra-admin-navegacion" className="barra-admin__cuerpo">
        <nav aria-label="Administración" className="barra-admin__nav">
          <p className="barra-admin__seccion">Administración</p>
          <ul className="barra-admin__lista">
            {SECCIONES.map(({ nombre, icono: Icono, ruta, exacta, sprint }) => (
              <li key={nombre}>
                {ruta ? (
                  <NavLink
                    to={ruta}
                    end={exacta}
                    className={({ isActive }) => `barra-admin__enlace${isActive ? ' barra-admin__enlace--activo' : ''}`}
                  >
                    <Icono size={18} aria-hidden="true" />
                    {nombre}
                  </NavLink>
                ) : (
                  <span className="barra-admin__enlace barra-admin__enlace--pronto" aria-disabled="true">
                    <Icono size={18} aria-hidden="true" />
                    {nombre}
                    <span className="barra-admin__sprint">{sprint}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="barra-admin__pie">
          <div className="barra-admin__tema">
            <span>Tema</span>
            <BotonTema />
          </div>
          <div className="barra-admin__usuario" data-testid="usuario-sesion">
            <span className="barra-admin__avatar" aria-hidden="true">
              {iniciales(user?.nombre)}
            </span>
            <span className="barra-admin__usuario-texto">
              <span className="barra-admin__nombre">{user?.nombre}</span>
              <span className="barra-admin__rol">{user?.rol}</span>
            </span>
            <button type="button" className="icono-btn" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={cerrarSesion}>
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

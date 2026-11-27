import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import '../assets/panel.css';

// Layout de las secciones privadas: /admin (administrador) y /cuenta (cliente).
// Misma estructura que AuthLayout: navbar y, debajo, la página.
export default function PanelLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

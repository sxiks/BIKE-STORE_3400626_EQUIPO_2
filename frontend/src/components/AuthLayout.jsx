import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import '../assets/auth.css';

// Layout de las vistas de autenticación (login, registro). Reemplaza a LabLayout desde F2.1:
// ya no hay raíz .lab, los estilos vienen del sistema de diseño (base.css + auth.css).
export default function AuthLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

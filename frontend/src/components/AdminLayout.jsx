import { Outlet } from 'react-router-dom';
import BarraAdmin from './BarraAdmin';
import '../assets/panel.css';
import '../assets/barra-admin.css';

// Layout del panel de administración (rediseño, estructura de la opción B): barra lateral y contenido.
// Va dentro de ProtectedRoute(admin): un cliente nunca lo ve (ve "No autorizado").
export default function AdminLayout() {
  return (
    <div className="admin">
      <BarraAdmin />
      <div className="admin__contenido">
        <Outlet />
      </div>
    </div>
  );
}

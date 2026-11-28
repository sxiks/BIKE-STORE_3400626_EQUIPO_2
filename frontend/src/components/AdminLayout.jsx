import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import BarraAdmin from './BarraAdmin';
import '../assets/panel.css';
import '../assets/barra-admin.css';

// Layout del panel de administración (rediseño, estructura de la opción B): barra lateral y contenido.
// Va dentro de ProtectedRoute(admin): un cliente nunca lo ve (ve "No autorizado").
// Las páginas del panel se cargan aparte (App.jsx, H-09): mientras llega una, se ve la barra lateral y "Cargando…".
export default function AdminLayout() {
  return (
    <div className="admin">
      <BarraAdmin />
      <div className="admin__contenido">
        <Suspense
          fallback={
            <p className="ruta-verificando" role="status">
              Cargando…
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

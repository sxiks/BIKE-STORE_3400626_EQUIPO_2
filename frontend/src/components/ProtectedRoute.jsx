import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NoAutorizadoPage from '../pages/NoAutorizadoPage';

/**
 * Protege un grupo de rutas (CU-22, RF-30).
 *   <Route element={<ProtectedRoute roles={['admin']} />}> ... </Route>
 * Sin `roles`, basta con tener sesión.
 *
 * Ocultar o proteger una pantalla NO es seguridad: el backend vuelve a validar sesión y rol en cada petición.
 */
export default function ProtectedRoute({ roles = null }) {
  const { isAuthenticated, user, verificando } = useAuth();
  const location = useLocation();

  // 1. Mientras /auth/me no responde, no se decide nada (al recargar /admin no debe expulsar antes de tiempo).
  if (verificando) {
    return (
      <p className="ruta-verificando" role="status">
        Verificando sesión…
      </p>
    );
  }

  // 2. Sin sesión: al login, recordando la ruta pedida para volver después.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 3. Con sesión pero sin el rol: se explica en la misma URL (no se redirige).
  if (roles && !roles.includes(user?.rol)) {
    return <NoAutorizadoPage />;
  }

  // 4. Rol correcto.
  return <Outlet />;
}

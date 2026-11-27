import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Rediseño: el administrador solo ve su panel. Si la sesión es de un admin, cualquier ruta
// de este grupo (tienda, acceso, Mi cuenta) lo lleva a /admin.
// Ocultar pantallas NO es seguridad: el backend vuelve a validar el rol en cada petición.
export default function SinAdmin() {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TemaProvider } from './context/TemaContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ClienteLayout from './components/ClienteLayout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import SinAdmin from './components/SinAdmin';
import TiendaPage from './pages/TiendaPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RecuperarPage from './pages/RecuperarPage';
import RestablecerPage from './pages/RestablecerPage';
import AdminInicioPage from './pages/admin/AdminInicioPage';
import UsuariosPage from './pages/admin/UsuariosPage';
import ProductosPage from './pages/admin/ProductosPage';
import ProductoFormPage from './pages/admin/ProductoFormPage';
import CuentaInicioPage from './pages/cuenta/CuentaInicioPage';
import './assets/base.css';

// Orden de los proveedores: Router → Tema → Toasts → Sesión. El tema va por fuera de todo lo visual.
// El Router y los Toasts van por fuera de AuthProvider,
// porque la sesión usa navigate() y mostrar() cuando la API la rechaza (F1.1).
// Secciones privadas (F1.2): /admin solo para admin y /cuenta solo para cliente.
// Rediseño: el administrador solo ve su panel (SinAdmin lo lleva a /admin desde cualquier otra ruta).
//   Cliente y público → BarraCliente (barra superior) · Admin → AdminLayout (barra lateral).
// Las páginas nuevas se agregan dentro de su grupo en los sprints siguientes. Ver docs/ROADMAP.md.
export default function App() {
  return (
    <BrowserRouter>
      <AppRutas />
    </BrowserRouter>
  );
}

// Proveedores + rutas, sin el Router: las pruebas lo montan con MemoryRouter en la ruta que necesiten.
export function AppRutas() {
  return (
    <TemaProvider>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Cliente y público. Si la sesión es de un admin, todo este grupo redirige a /admin. */}
            <Route element={<SinAdmin />}>
              {/* Tienda: usa BarraCliente con carrito y búsqueda (aún con datos simulados) */}
              <Route path="/" element={<TiendaPage />} />

              <Route element={<ClienteLayout />}>
                {/* Acceso */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/registro" element={<RegisterPage />} />
                <Route path="/recuperar" element={<RecuperarPage />} />
                <Route path="/restablecer" element={<RestablecerPage />} />

                {/* Cuenta del cliente */}
                <Route element={<ProtectedRoute roles={['cliente']} />}>
                  <Route path="/cuenta" element={<CuentaInicioPage />} />
                </Route>
              </Route>
            </Route>

            {/* Administración: un cliente ve "No autorizado" (con la barra del cliente) */}
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminInicioPage />} />
                <Route path="/admin/usuarios" element={<UsuariosPage />} />
                {/* Productos (F2.3): listado, crear y editar. "nuevo" gana a ":id" por ser una ruta fija. */}
                <Route path="/admin/productos" element={<ProductosPage />} />
                <Route path="/admin/productos/nuevo" element={<ProductoFormPage key="nuevo" />} />
                <Route path="/admin/productos/:id" element={<ProductoFormPage key="editar" />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </TemaProvider>
  );
}

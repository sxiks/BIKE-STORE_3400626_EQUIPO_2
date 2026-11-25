import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import AuthLayout from './components/AuthLayout';
import PanelLayout from './components/PanelLayout';
import ProtectedRoute from './components/ProtectedRoute';
import TiendaPage from './pages/TiendaPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminInicioPage from './pages/admin/AdminInicioPage';
import CuentaInicioPage from './pages/cuenta/CuentaInicioPage';
import './assets/base.css';

// Orden de los proveedores: el Router y los Toasts van por fuera de AuthProvider,
// porque la sesión usa navigate() y mostrar() cuando la API la rechaza (F1.1).
// Secciones privadas (F1.2): /admin solo para admin y /cuenta solo para cliente.
// Las páginas de cada sección se agregan dentro de su grupo en los sprints siguientes. Ver docs/ROADMAP.md.
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
    <ToastProvider>
      <AuthProvider>
        <Routes>
          {/* Pública: catálogo + carrito (aún con datos simulados) */}
          <Route path="/" element={<TiendaPage />} />

          {/* Autenticación */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
          </Route>

          {/* Privadas: la navbar (PanelLayout) se ve también en "Verificando…" y "No autorizado" */}
          <Route element={<PanelLayout />}>
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin" element={<AdminInicioPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['cliente']} />}>
              <Route path="/cuenta" element={<CuentaInicioPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

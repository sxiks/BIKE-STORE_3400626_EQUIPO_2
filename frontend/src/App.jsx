import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import LabLayout from './components/LabLayout';
import TiendaPage from './pages/TiendaPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './assets/base.css';

// Orden de los proveedores: el Router y los Toasts van por fuera de AuthProvider,
// porque la sesión usa navigate() y mostrar() cuando la API la rechaza (F1.1).
// Las rutas protegidas (carrito real, checkout, pedidos, panel admin) se agregan en los
// sprints de frontend usando components/ProtectedRoute.jsx. Ver docs/ROADMAP.md.
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

          {/* Autenticación (estilos heredados del Laboratorio) */}
          <Route element={<LabLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LabLayout from './components/LabLayout';
import TiendaPage from './pages/TiendaPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './assets/base.css';

// Las rutas protegidas (carrito real, checkout, pedidos, panel admin) se agregan en los
// sprints de frontend usando components/ProtectedRoute.jsx. Ver docs/ROADMAP.md.
export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TemaProvider } from './context/TemaContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
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
import CategoriasPage from './pages/admin/CategoriasPage';
import ProductoPage from './pages/ProductoPage';
import CuentaInicioPage from './pages/cuenta/CuentaInicioPage';
import CheckoutPage from './pages/cuenta/CheckoutPage';
import './assets/base.css';

// Orden de los proveedores: Router → Tema → Toasts → Sesión → Carrito. El tema va por fuera de todo lo visual.
// F3.1: el carrito va dentro de la sesión, porque según quién entre vive en el navegador (visitante) o en la API (cliente).
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
          <CarritoProvider>
            <Routes>
              {/* Cliente y público. Si la sesión es de un admin, todo este grupo redirige a /admin. */}
              <Route element={<SinAdmin />}>
                {/* Tienda: usa BarraCliente con carrito y búsqueda (aún con datos simulados) */}
                <Route path="/" element={<TiendaPage />} />
                {/* Detalle del producto con su galería (F2.4): también usa BarraCliente con el carrito */}
                <Route path="/producto/:id" element={<ProductoPage />} />

                <Route element={<ClienteLayout />}>
                  {/* Acceso */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/registro" element={<RegisterPage />} />
                  <Route path="/recuperar" element={<RecuperarPage />} />
                  <Route path="/restablecer" element={<RestablecerPage />} />

                  {/* Cuenta del cliente */}
                  <Route element={<ProtectedRoute roles={['cliente']} />}>
                    <Route path="/cuenta" element={<CuentaInicioPage />} />
                    {/* F3.1: provisional (resumen); F3.3 agrega envío y pago. Un visitante pasa antes por el login. */}
                    <Route path="/checkout" element={<CheckoutPage />} />
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
                  {/* Categorías (F2.4 · decisión M) */}
                  <Route path="/admin/categorias" element={<CategoriasPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CarritoProvider>
        </AuthProvider>
      </ToastProvider>
    </TemaProvider>
  );
}

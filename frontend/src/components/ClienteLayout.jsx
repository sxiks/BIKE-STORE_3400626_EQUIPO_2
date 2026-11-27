import { Outlet } from 'react-router-dom';
import BarraCliente from './BarraCliente';
import '../assets/auth.css';

// Layout del cliente y de las páginas públicas sin carrito: acceso (login, registro, recuperar,
// restablecer) y Mi cuenta. La tienda usa BarraCliente directamente, porque le pasa el carrito.
export default function ClienteLayout() {
  return (
    <>
      <BarraCliente />
      <Outlet />
    </>
  );
}

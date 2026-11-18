import { useCallback, useState } from 'react';
import { ToastProvider } from '../context/ToastContext';
import { CarritoProvider } from '../context/CarritoContext';
import NavbarTienda from '../components/NavbarTienda';
import Catalogo from '../components/Catalogo';
import CarritoPanel from '../components/CarritoPanel';
import '../assets/tienda.css';

// Origen: App.jsx del proyecto Carrito, convertido en página de la SPA.
// Ruta pública (CU-01: el catálogo se consulta sin autenticación).
export default function TiendaPage() {
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const cerrarCarrito = useCallback(() => setCarritoAbierto(false), []);

  return (
    <div className="tienda">
      <ToastProvider>
        <CarritoProvider>
          <NavbarTienda onAbrirCarrito={() => setCarritoAbierto(true)} />
          <main className="contenido">
            <Catalogo />
          </main>
          <CarritoPanel abierto={carritoAbierto} onCerrar={cerrarCarrito} />
        </CarritoProvider>
      </ToastProvider>
    </div>
  );
}

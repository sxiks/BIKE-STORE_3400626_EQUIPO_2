import { useCallback, useState } from 'react';
import { CarritoProvider, useCarrito } from '../context/CarritoContext';
import Navbar from '../components/Navbar';
import Catalogo from '../components/Catalogo';
import CarritoPanel from '../components/CarritoPanel';
import '../assets/tienda.css';

// Origen: App.jsx del proyecto Carrito, convertido en página de la SPA.
// Ruta pública (CU-01: el catálogo se consulta sin autenticación).
// El ToastProvider ahora está en App.jsx (F1.1), para que los avisos se vean en toda la aplicación.
export default function TiendaPage() {
  return (
    <CarritoProvider>
      <TiendaContenido />
    </CarritoProvider>
  );
}

// Separado de TiendaPage porque necesita leer el carrito (useCarrito) dentro de su proveedor.
function TiendaContenido() {
  const { totalUnidades } = useCarrito();
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const abrirCarrito = useCallback(() => setCarritoAbierto(true), []);
  const cerrarCarrito = useCallback(() => setCarritoAbierto(false), []);

  return (
    <>
      <Navbar carrito={{ totalUnidades, onAbrir: abrirCarrito }} />
      <main className="contenedor">
        <Catalogo />
      </main>
      <CarritoPanel abierto={carritoAbierto} onCerrar={cerrarCarrito} />
    </>
  );
}

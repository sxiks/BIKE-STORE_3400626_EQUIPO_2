import { useCallback, useState } from 'react';
import { CarritoProvider, useCarrito } from '../context/CarritoContext';
import BarraCliente from '../components/BarraCliente';
import ProductoDestacado from '../components/ProductoDestacado';
import Catalogo from '../components/Catalogo';
import CarritoPanel from '../components/CarritoPanel';
import '../assets/tienda.css';

// Origen: App.jsx del proyecto Carrito, convertido en página de la SPA.
// Ruta pública (CU-01: el catálogo se consulta sin autenticación). El admin no llega aquí (SinAdmin).
// Rediseño: barra superior del cliente con búsqueda y carrito, bloque "Destacado" y catálogo.
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
  const [busqueda, setBusqueda] = useState('');
  const abrirCarrito = useCallback(() => setCarritoAbierto(true), []);
  const cerrarCarrito = useCallback(() => setCarritoAbierto(false), []);

  return (
    <>
      <BarraCliente
        carrito={{ totalUnidades, onAbrir: abrirCarrito }}
        busqueda={{ valor: busqueda, onCambiar: setBusqueda }}
      />
      <main className="contenedor tienda">
        {!busqueda.trim() && <ProductoDestacado />}
        <Catalogo busqueda={busqueda} />
      </main>
      <CarritoPanel abierto={carritoAbierto} onCerrar={cerrarCarrito} />
    </>
  );
}

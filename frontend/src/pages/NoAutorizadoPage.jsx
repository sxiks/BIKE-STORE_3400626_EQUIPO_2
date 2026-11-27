import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import BarraCliente from '../components/BarraCliente';
import '../assets/panel.css';

// Se muestra cuando alguien con sesión abre una sección que no corresponde a su rol (F1.2).
// Solo llega aquí un cliente que abre /admin (el admin nunca ve páginas de cliente: SinAdmin).
// Trae su propia barra, porque ProtectedRoute la muestra fuera de cualquier layout.
export default function NoAutorizadoPage() {
  return (
    <>
      <BarraCliente />
      <main className="contenedor">
        <section className="panel__aviso tarjeta">
          <ShieldAlert size={40} aria-hidden="true" className="panel__aviso-icono" />
          <h1>No autorizado</h1>
          <p>Tu cuenta no tiene permisos para ver esta sección.</p>
          <Link to="/" className="btn btn--primario">
            Volver a la tienda
          </Link>
        </section>
      </main>
    </>
  );
}

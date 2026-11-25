import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import '../assets/panel.css';

// Se muestra cuando alguien con sesión abre una sección que no corresponde a su rol (F1.2).
export default function NoAutorizadoPage() {
  return (
    <main className="panel">
      <section className="panel__aviso">
        <ShieldAlert size={40} aria-hidden="true" className="panel__aviso-icono" />
        <h1>No autorizado</h1>
        <p>Tu cuenta no tiene permisos para ver esta sección.</p>
        <Link to="/" className="panel__enlace">
          Volver a la tienda
        </Link>
      </section>
    </main>
  );
}

import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../assets/panel.css';

// Inicio de la cuenta del cliente (F1.2). Cada sección es un enlace cuando su tarea está integrada.
const SECCIONES = [{ nombre: 'Mis pedidos', detalle: 'Historial y detalle de tus compras', ruta: '/cuenta/pedidos' }];

export default function CuentaInicioPage() {
  const { user } = useAuth();

  return (
    <main className="contenedor">
      <header className="panel__encabezado">
        <h1>Mi cuenta</h1>
        <p>
          {user?.nombre} · {user?.email}
        </p>
      </header>
      <ul className="panel__secciones">
        {SECCIONES.map((seccion) => (
          <li key={seccion.nombre} className="panel__seccion tarjeta">
            <h2>
              <Link to={seccion.ruta} className="panel__seccion-enlace">
                {seccion.nombre}
              </Link>
            </h2>
            <p>{seccion.detalle}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

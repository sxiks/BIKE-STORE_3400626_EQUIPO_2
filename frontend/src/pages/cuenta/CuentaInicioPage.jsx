import { useAuth } from '../../hooks/useAuth';
import '../../assets/panel.css';

// Inicio provisional de la cuenta del cliente (F1.2). "Mis pedidos" llega en F3.2.
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
        <li className="panel__seccion tarjeta">
          <h2>Mis pedidos</h2>
          <p>Historial y detalle de tus compras</p>
          <span className="etiqueta etiqueta--aviso">Próximamente · F3.2 · Sprint 3</span>
        </li>
      </ul>
    </main>
  );
}

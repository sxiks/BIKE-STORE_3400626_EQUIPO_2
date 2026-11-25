import { useAuth } from '../../hooks/useAuth';

// Inicio provisional de la cuenta del cliente (F1.2). "Mis pedidos" llega en F3.2.
export default function CuentaInicioPage() {
  const { user } = useAuth();

  return (
    <main className="panel">
      <header className="panel__encabezado">
        <h1>Mi cuenta</h1>
        <p>
          {user?.nombre} · {user?.email}
        </p>
      </header>
      <ul className="panel__secciones">
        <li className="panel__seccion">
          <h2>Mis pedidos</h2>
          <p>Historial y detalle de tus compras</p>
          <span className="panel__pendiente">Próximamente · F3.2 · Sprint 3</span>
        </li>
      </ul>
    </main>
  );
}

import { useAuth } from '../../hooks/useAuth';

// Inicio provisional del panel de administración (F1.2).
// Cada sección se convierte en un enlace cuando su tarea esté integrada.
const SECCIONES = [
  { nombre: 'Usuarios', detalle: 'Buscar usuarios, cambiar rol y estado', tarea: 'F1.4 · Sprint 1' },
  { nombre: 'Productos', detalle: 'Crear, editar e inactivar productos', tarea: 'F2.3 · Sprint 2' },
  { nombre: 'Tablero', detalle: 'Métricas de ventas, alertas e informes', tarea: 'F4.1 · Sprint 4' }
];

export default function AdminInicioPage() {
  const { user } = useAuth();

  return (
    <main className="panel">
      <header className="panel__encabezado">
        <h1>Panel de administración</h1>
        <p>Hola, {user?.nombre}. Estas son las secciones del panel.</p>
      </header>
      <ul className="panel__secciones">
        {SECCIONES.map((seccion) => (
          <li key={seccion.nombre} className="panel__seccion">
            <h2>{seccion.nombre}</h2>
            <p>{seccion.detalle}</p>
            <span className="panel__pendiente">Próximamente · {seccion.tarea}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

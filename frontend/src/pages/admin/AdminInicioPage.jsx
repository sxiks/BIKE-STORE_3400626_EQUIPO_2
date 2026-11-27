import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../assets/panel.css';

// Inicio provisional del panel de administración (F1.2).
// Cada sección se convierte en un enlace (campo `ruta`) cuando su tarea esté integrada.
const SECCIONES = [
  { nombre: 'Usuarios', detalle: 'Buscar usuarios, cambiar rol y estado', ruta: '/admin/usuarios' },
  { nombre: 'Productos', detalle: 'Crear, editar e inactivar productos', tarea: 'F2.3 · Sprint 2' },
  { nombre: 'Tablero', detalle: 'Métricas de ventas, alertas e informes', tarea: 'F4.1 · Sprint 4' }
];

export default function AdminInicioPage() {
  const { user } = useAuth();

  return (
    <main className="contenedor">
      <header className="panel__encabezado">
        <h1>Panel de administración</h1>
        <p>Hola, {user?.nombre}. Estas son las secciones del panel.</p>
      </header>
      <ul className="panel__secciones">
        {SECCIONES.map((seccion) => (
          <li key={seccion.nombre} className="panel__seccion tarjeta">
            <h2>
              {seccion.ruta ? (
                <Link to={seccion.ruta} className="panel__seccion-enlace">
                  {seccion.nombre}
                </Link>
              ) : (
                seccion.nombre
              )}
            </h2>
            <p>{seccion.detalle}</p>
            {seccion.ruta ? (
              <span className="etiqueta etiqueta--exito">Disponible</span>
            ) : (
              <span className="etiqueta etiqueta--aviso">Próximamente · {seccion.tarea}</span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

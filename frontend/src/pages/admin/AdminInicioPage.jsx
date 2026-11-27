import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../assets/panel.css';

// Inicio del panel de administración (F1.2): una tarjeta por sección, cada una con su página (desde F4).
const SECCIONES = [
  { nombre: 'Usuarios', detalle: 'Buscar usuarios, cambiar rol y estado', ruta: '/admin/usuarios' },
  { nombre: 'Productos', detalle: 'Crear, editar e inactivar productos, con su galería de imágenes', ruta: '/admin/productos' },
  { nombre: 'Categorías', detalle: 'Crear, renombrar y eliminar categorías sin productos', ruta: '/admin/categorias' },
  { nombre: 'Pedidos', detalle: 'Ver y buscar los pedidos de todos los clientes', ruta: '/admin/pedidos' },
  { nombre: 'Tablero', detalle: 'Métricas de ventas, alertas e informes en Excel y PDF', ruta: '/admin/dashboard' }
];

export default function AdminInicioPage() {
  const { user } = useAuth();

  return (
    <main className="contenedor contenedor--panel">
      <header className="panel__encabezado">
        <h1>Panel de administración</h1>
        <p>Hola, {user?.nombre}. Estas son las secciones del panel.</p>
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

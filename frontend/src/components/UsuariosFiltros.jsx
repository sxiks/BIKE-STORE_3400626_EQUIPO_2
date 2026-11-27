import { Search } from 'lucide-react';
import '../assets/usuarios.css';

const ROLES = [
  { valor: '', texto: 'Todos' },
  { valor: 'cliente', texto: 'Clientes' },
  { valor: 'admin', texto: 'Administradores' }
];
const ESTADOS = [
  { valor: '', texto: 'Todos' },
  { valor: 'activo', texto: 'Activos' },
  { valor: 'inactivo', texto: 'Inactivos' }
];

// Grupo de botones segmentados: uno solo queda presionado (aria-pressed).
function Segmentado({ etiqueta, opciones, valor, onElegir }) {
  return (
    <div className="segmentado" role="group" aria-label={etiqueta}>
      {opciones.map((opcion) => (
        <button
          key={opcion.valor || 'todos'}
          type="button"
          className={`segmentado__opcion${opcion.valor === valor ? ' segmentado__opcion--activa' : ''}`}
          aria-pressed={opcion.valor === valor}
          onClick={() => onElegir(opcion.valor)}
        >
          {opcion.texto}
        </button>
      ))}
    </div>
  );
}

// Buscador y filtros del listado de usuarios (CU-19). Solo muestra los valores y avisa los cambios.
// onCambiar(campo, valor): campo es 'q', 'rol' o 'estado'.
// Rediseño: rol y estado son botones segmentados en lugar de listas desplegables.
export default function UsuariosFiltros({ q, rol, estado, onCambiar }) {
  return (
    <form className="usuarios-filtros" role="search" aria-label="Buscar usuarios" onSubmit={(e) => e.preventDefault()}>
      <div className="campo usuarios-filtros__busqueda">
        <label className="solo-lector" htmlFor="usuarios-q">
          Buscar por nombre o correo
        </label>
        <div className="campo__control">
          <Search size={18} aria-hidden="true" className="campo__icono" />
          <input
            id="usuarios-q"
            type="search"
            className="input input--con-icono"
            placeholder="Buscar por nombre o correo"
            value={q}
            onChange={(e) => onCambiar('q', e.target.value)}
          />
        </div>
      </div>

      <Segmentado etiqueta="Rol" opciones={ROLES} valor={rol} onElegir={(v) => onCambiar('rol', v)} />
      <Segmentado etiqueta="Estado" opciones={ESTADOS} valor={estado} onElegir={(v) => onCambiar('estado', v)} />
    </form>
  );
}

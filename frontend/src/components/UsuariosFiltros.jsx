import { Search } from 'lucide-react';
import '../assets/usuarios.css';

// Buscador y filtros del listado de usuarios (CU-19). Solo muestra los valores y avisa los cambios.
// onCambiar(campo, valor): campo es 'q', 'rol' o 'estado'.
export default function UsuariosFiltros({ q, rol, estado, onCambiar }) {
  return (
    <form className="usuarios-filtros tarjeta" role="search" aria-label="Buscar usuarios" onSubmit={(e) => e.preventDefault()}>
      <div className="campo">
        <label className="campo__etiqueta" htmlFor="usuarios-q">
          Buscar por nombre o correo
        </label>
        <div className="campo__control">
          <Search size={18} aria-hidden="true" className="campo__icono" />
          <input
            id="usuarios-q"
            type="search"
            className="input input--con-icono"
            placeholder="Ej. Ana o ana@correo.com"
            value={q}
            onChange={(e) => onCambiar('q', e.target.value)}
          />
        </div>
      </div>

      <div className="campo">
        <label className="campo__etiqueta" htmlFor="usuarios-rol">
          Rol
        </label>
        <select id="usuarios-rol" className="input" value={rol} onChange={(e) => onCambiar('rol', e.target.value)}>
          <option value="">Todos</option>
          <option value="admin">Administrador</option>
          <option value="cliente">Cliente</option>
        </select>
      </div>

      <div className="campo">
        <label className="campo__etiqueta" htmlFor="usuarios-estado">
          Estado
        </label>
        <select id="usuarios-estado" className="input" value={estado} onChange={(e) => onCambiar('estado', e.target.value)}>
          <option value="">Todos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>
    </form>
  );
}

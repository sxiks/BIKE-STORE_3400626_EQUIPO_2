import { Search } from 'lucide-react';
import Segmentado from './Segmentado';
import '../assets/productos.css';

const ESTADOS = [
  { valor: '', texto: 'Todos' },
  { valor: 'activo', texto: 'Activos' },
  { valor: 'inactivo', texto: 'Inactivos' }
];

// Buscador y filtros del panel de productos (CU-15). Solo muestra los valores y avisa los cambios.
//   q, categoria, estado: valores actuales · categorias: [Categoria] · onCambiar(campo, valor)
// La categoría es una lista desplegable (pueden ser muchas); el estado, botones segmentados como en usuarios.
export default function ProductosFiltros({ q, categoria, estado, categorias = [], onCambiar }) {
  return (
    <form className="productos-filtros" role="search" aria-label="Buscar productos" onSubmit={(e) => e.preventDefault()}>
      <div className="campo productos-filtros__busqueda">
        <label className="solo-lector" htmlFor="productos-q">
          Buscar por nombre
        </label>
        <div className="campo__control">
          <Search size={18} aria-hidden="true" className="campo__icono" />
          <input
            id="productos-q"
            type="search"
            className="input input--con-icono"
            placeholder="Buscar por nombre"
            value={q}
            onChange={(e) => onCambiar('q', e.target.value)}
          />
        </div>
      </div>

      <div className="campo productos-filtros__categoria">
        <label className="solo-lector" htmlFor="productos-categoria">
          Categoría
        </label>
        <select
          id="productos-categoria"
          className="input"
          value={categoria}
          onChange={(e) => onCambiar('categoria', e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id_categoria} value={String(c.id_categoria)}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <Segmentado etiqueta="Estado" opciones={ESTADOS} valor={estado} onElegir={(v) => onCambiar('estado', v)} />
    </form>
  );
}

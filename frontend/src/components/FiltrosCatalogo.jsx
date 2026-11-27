// Filtros del catálogo (F2.2): categoría (pastillas) y orden por precio. Solo props; la página guarda
// los valores en la URL (?categoria=&orden=) y pide los productos a la API.
//   categorias: [{ id_categoria, nombre }] · categoria: id como texto ('' = todas) · orden: '' | 'precio_asc' | 'precio_desc'
export default function FiltrosCatalogo({ categorias, categoria, orden, onCategoria, onOrden }) {
  const opciones = [{ id_categoria: '', nombre: 'Todas' }, ...categorias];

  return (
    <div className="filtros-catalogo">
      <div className="filtros-catalogo__categorias" role="group" aria-label="Categorías">
        {opciones.map((c) => {
          const valor = String(c.id_categoria);
          const activa = valor === categoria;
          return (
            <button
              key={valor || 'todas'}
              type="button"
              className={`filtros-catalogo__pastilla${activa ? ' filtros-catalogo__pastilla--activa' : ''}`}
              aria-pressed={activa}
              onClick={() => onCategoria(valor)}
            >
              {c.nombre}
            </button>
          );
        })}
      </div>

      <label className="filtros-catalogo__orden">
        <span>Ordenar por</span>
        <select className="input" value={orden} onChange={(e) => onOrden(e.target.value)}>
          <option value="">Relevancia</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
        </select>
      </label>
    </div>
  );
}

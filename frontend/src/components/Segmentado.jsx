import '../assets/segmentado.css';

// Grupo de botones segmentados: uno solo queda presionado (aria-pressed).
// Lo usan los filtros de usuarios (F1.4) y de productos (F2.3).
//   etiqueta: nombre accesible del grupo · opciones: [{ valor, texto }] · valor: el elegido · onElegir(valor)
export default function Segmentado({ etiqueta, opciones, valor, onElegir }) {
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

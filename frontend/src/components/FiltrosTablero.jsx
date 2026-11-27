import { useEffect, useState } from 'react';
import { esteMes, rangoValido, ultimos30Dias } from '../utils/fechas';
import '../assets/tablero.css';

// Filtros del tablero (F4.1 · CU-17): desde, hasta y categoría, con dos atajos de fechas.
// Edita un borrador y solo avisa al aplicar (botón "Aplicar" o un atajo): la página guarda los filtros en la URL.
//   aplicados: { desde, hasta, categoria } (textos; '' = sin filtro) · categorias: [Categoria] · onAplicar(filtros)
export default function FiltrosTablero({ aplicados, categorias = [], onAplicar }) {
  const [borrador, setBorrador] = useState(aplicados);
  const [error, setError] = useState(null);

  // Si los filtros cambian desde afuera (atrás/adelante del navegador), el formulario los refleja.
  const { desde, hasta, categoria } = aplicados;
  useEffect(() => {
    setBorrador({ desde, hasta, categoria });
    setError(null);
  }, [desde, hasta, categoria]);

  function cambiar(campo, valor) {
    setBorrador((prev) => ({ ...prev, [campo]: valor }));
    setError(null);
  }

  function aplicar(filtros) {
    if (!rangoValido(filtros)) {
      setError('La fecha "desde" no puede ser posterior a "hasta".');
      return;
    }
    onAplicar(filtros);
  }

  return (
    <form
      className="tablero-filtros tarjeta"
      aria-label="Filtros del tablero"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        aplicar(borrador);
      }}
    >
      <div className="tablero-filtros__campos">
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="tablero-desde">
            Desde
          </label>
          <input
            id="tablero-desde"
            type="date"
            className="input"
            value={borrador.desde}
            max={borrador.hasta || undefined}
            onChange={(e) => cambiar('desde', e.target.value)}
          />
        </div>
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="tablero-hasta">
            Hasta
          </label>
          <input
            id="tablero-hasta"
            type="date"
            className="input"
            value={borrador.hasta}
            min={borrador.desde || undefined}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'tablero-filtros-error' : undefined}
            onChange={(e) => cambiar('hasta', e.target.value)}
          />
        </div>
        <div className="campo tablero-filtros__categoria">
          <label className="campo__etiqueta" htmlFor="tablero-categoria">
            Categoría
          </label>
          <select
            id="tablero-categoria"
            className="input"
            value={borrador.categoria}
            onChange={(e) => cambiar('categoria', e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={String(c.id_categoria)}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="tablero-filtros__acciones">
          <button type="submit" className="btn btn--primario">
            Aplicar
          </button>
          <button type="button" className="btn btn--suave" onClick={() => aplicar({ desde: '', hasta: '', categoria: '' })}>
            Limpiar
          </button>
        </div>
      </div>

      {error && (
        <p className="campo__error" id="tablero-filtros-error" role="alert">
          {error}
        </p>
      )}

      <div className="tablero-filtros__atajos" role="group" aria-label="Atajos de fechas">
        <span>Atajos:</span>
        <button type="button" className="btn btn--suave" onClick={() => aplicar({ ...borrador, ...esteMes() })}>
          Este mes
        </button>
        <button type="button" className="btn btn--suave" onClick={() => aplicar({ ...borrador, ...ultimos30Dias() })}>
          Últimos 30 días
        </button>
      </div>
    </form>
  );
}

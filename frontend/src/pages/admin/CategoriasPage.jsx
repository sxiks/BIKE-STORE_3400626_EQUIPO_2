import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  crearCategoria,
  eliminarCategoria,
  listarCategoriasAdmin,
  renombrarCategoria
} from '../../services/categorias.service';
import DialogoConfirmacion from '../../components/DialogoConfirmacion';
import '../../assets/panel.css';
import '../../assets/productos.css';
import '../../assets/categorias.css';

// Categorías del administrador (F2.4 · decisión M): crear, renombrar y eliminar las que no tienen productos.
// Reacciona por `code` (API_CONTRATOS.md): CATEGORIA_DUPLICADA marca el campo; CATEGORIA_CON_PRODUCTOS avisa y refresca.

const NOMBRE_MAX = 100; // categorias.nombre es VARCHAR(100)

function errorNombre(nombre) {
  const limpio = nombre.trim();
  if (!limpio) return 'Escribe el nombre de la categoría';
  if (limpio.length > NOMBRE_MAX) return `El nombre admite máximo ${NOMBRE_MAX} caracteres`;
  return null;
}

const textoProductos = (n) => (n === 1 ? '1 producto' : `${n} productos`);

export default function CategoriasPage() {
  const { mostrar } = useToast();

  const [categorias, setCategorias] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [version, setVersion] = useState(0);

  const [nueva, setNueva] = useState('');
  const [errorNueva, setErrorNueva] = useState('');
  const [creando, setCreando] = useState(false);

  const [edicion, setEdicion] = useState(null); // { id, nombre, error }
  const [guardando, setGuardando] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const campoEdicion = useRef(null);

  useEffect(() => {
    let cancelado = false;
    setErrorCarga(null);
    listarCategoriasAdmin()
      .then(({ data }) => {
        if (!cancelado) setCategorias(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!cancelado) setErrorCarga(error.message);
      });
    return () => {
      cancelado = true;
    };
  }, [version]);

  // Al empezar a renombrar, el foco va al campo.
  const idEdicion = edicion?.id;
  useEffect(() => {
    if (idEdicion) campoEdicion.current?.focus();
  }, [idEdicion]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  // La API responde la categoría con su conteo: se reemplaza o se agrega y se ordena por nombre.
  function guardarEnLista(categoria) {
    setCategorias((prev) =>
      [...prev.filter((c) => c.id_categoria !== categoria.id_categoria), categoria].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es')
      )
    );
  }

  async function crear(event) {
    event.preventDefault();
    const error = errorNombre(nueva);
    setErrorNueva(error ?? '');
    if (error) return;

    setCreando(true);
    try {
      const { data } = await crearCategoria(nueva.trim());
      guardarEnLista(data);
      setNueva('');
      mostrar(`Se creó la categoría ${data.nombre}.`);
    } catch (err) {
      if (err.code === 'CATEGORIA_DUPLICADA' || err.status === 400) setErrorNueva(err.message);
      else mostrar(err.message);
    } finally {
      setCreando(false);
    }
  }

  async function guardarEdicion(event) {
    event.preventDefault();
    const error = errorNombre(edicion.nombre);
    if (error) {
      setEdicion((prev) => ({ ...prev, error }));
      return;
    }
    const original = categorias.find((c) => c.id_categoria === edicion.id);
    if (original && original.nombre === edicion.nombre.trim()) {
      setEdicion(null);
      return;
    }

    setGuardando(true);
    try {
      const { data } = await renombrarCategoria(edicion.id, edicion.nombre.trim());
      guardarEnLista(data);
      setEdicion(null);
      mostrar(`La categoría ahora se llama ${data.nombre}.`);
    } catch (err) {
      if (err.code === 'CATEGORIA_DUPLICADA' || err.status === 400) {
        setEdicion((prev) => ({ ...prev, error: err.message }));
      } else {
        mostrar(err.message);
        setEdicion(null);
        if (err.status === 404) recargar();
      }
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    setEliminando(true);
    try {
      await eliminarCategoria(porEliminar.id_categoria);
      setCategorias((prev) => prev.filter((c) => c.id_categoria !== porEliminar.id_categoria));
      mostrar(`Se eliminó la categoría ${porEliminar.nombre}.`);
    } catch (err) {
      mostrar(err.message);
      // Alguien creó un producto en ella, o ya no existe: se refresca para mostrar el estado real.
      if (err.code === 'CATEGORIA_CON_PRODUCTOS' || err.status === 404) recargar();
    } finally {
      setEliminando(false);
      setPorEliminar(null);
    }
  }

  return (
    <main className="contenedor contenedor--panel">
      <header className="panel__encabezado">
        <h1>Categorías</h1>
        <p>Crea y renombra categorías. Solo puedes eliminar las que no tienen productos, ni activos ni inactivos.</p>
      </header>

      <form className="categorias__crear tarjeta" onSubmit={crear} noValidate aria-label="Crear categoría">
        <div className="campo categorias__campo">
          <label className="campo__etiqueta" htmlFor="categoria-nueva">
            Nueva categoría
          </label>
          <input
            id="categoria-nueva"
            className="input"
            placeholder="Ej.: Repuestos"
            value={nueva}
            maxLength={NOMBRE_MAX + 20}
            aria-invalid={Boolean(errorNueva)}
            aria-describedby={errorNueva ? 'categoria-nueva-error' : undefined}
            onChange={(e) => {
              setNueva(e.target.value);
              setErrorNueva('');
            }}
          />
          {errorNueva && (
            <p className="campo__error" id="categoria-nueva-error">
              {errorNueva}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn--primario" disabled={creando}>
          <Plus size={18} aria-hidden="true" />
          {creando ? 'Creando…' : 'Crear categoría'}
        </button>
      </form>

      {categorias === null && !errorCarga && (
        <p className="productos__mensaje" role="status">
          Cargando categorías…
        </p>
      )}

      {errorCarga && (
        <div className="productos__error">
          <p className="alerta alerta--error" role="alert">
            {errorCarga}
          </p>
          <button type="button" className="btn btn--primario" onClick={recargar}>
            Reintentar
          </button>
        </div>
      )}

      {!errorCarga && categorias?.length === 0 && (
        <p className="productos__mensaje tarjeta" role="status">
          Aún no hay categorías. Crea la primera con el formulario de arriba.
        </p>
      )}

      {!errorCarga && categorias?.length > 0 && (
        <ul className="categorias__lista" aria-label="Categorías">
          {categorias.map((categoria) => {
            const editando = edicion?.id === categoria.id_categoria;
            const conProductos = categoria.total_productos > 0;
            const idNota = `categoria-nota-${categoria.id_categoria}`;

            return (
              <li key={categoria.id_categoria} className="categorias__fila tarjeta">
                {editando ? (
                  <form className="categorias__edicion" onSubmit={guardarEdicion} noValidate aria-label={`Renombrar ${categoria.nombre}`}>
                    <div className="campo categorias__campo">
                      <label className="solo-lector" htmlFor={`categoria-${categoria.id_categoria}`}>
                        Nuevo nombre de {categoria.nombre}
                      </label>
                      <input
                        ref={campoEdicion}
                        id={`categoria-${categoria.id_categoria}`}
                        className="input"
                        value={edicion.nombre}
                        aria-invalid={Boolean(edicion.error)}
                        aria-describedby={edicion.error ? `categoria-${categoria.id_categoria}-error` : undefined}
                        onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value, error: '' })}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEdicion(null);
                        }}
                      />
                      {edicion.error && (
                        <p className="campo__error" id={`categoria-${categoria.id_categoria}-error`}>
                          {edicion.error}
                        </p>
                      )}
                    </div>
                    <div className="categorias__acciones">
                      <button type="submit" className="btn btn--primario" disabled={guardando}>
                        <Check size={16} aria-hidden="true" />
                        {guardando ? 'Guardando…' : 'Guardar'}
                      </button>
                      <button type="button" className="btn btn--suave" onClick={() => setEdicion(null)}>
                        <X size={16} aria-hidden="true" />
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="categorias__datos">
                      <span className="categorias__nombre">{categoria.nombre}</span>
                      <span className="categorias__total" id={idNota}>
                        {conProductos ? textoProductos(categoria.total_productos) : 'Sin productos'}
                      </span>
                    </div>
                    <div className="categorias__acciones">
                      <button
                        type="button"
                        className="btn btn--suave"
                        aria-label={`Renombrar ${categoria.nombre}`}
                        onClick={() => setEdicion({ id: categoria.id_categoria, nombre: categoria.nombre, error: '' })}
                      >
                        <Pencil size={16} aria-hidden="true" />
                        Renombrar
                      </button>
                      <button
                        type="button"
                        className="btn btn--suave categorias__eliminar"
                        aria-label={`Eliminar ${categoria.nombre}`}
                        aria-describedby={conProductos ? idNota : undefined}
                        title={conProductos ? 'Solo se pueden eliminar categorías sin productos' : undefined}
                        disabled={conProductos}
                        onClick={() => setPorEliminar(categoria)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {porEliminar && (
        <DialogoConfirmacion
          titulo="Eliminar categoría"
          mensaje={`¿Eliminar la categoría ${porEliminar.nombre}? Esta acción no se puede deshacer.`}
          textoConfirmar="Sí, eliminar"
          peligro
          ocupado={eliminando}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </main>
  );
}

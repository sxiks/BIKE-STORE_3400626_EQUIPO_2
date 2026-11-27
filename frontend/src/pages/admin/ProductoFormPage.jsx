import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  actualizarProducto,
  crearProducto,
  listarCategorias,
  obtenerProductoAdmin
} from '../../services/productos.service';
import { validarProducto } from '../../utils/validaciones';
import CampoImagen from '../../components/CampoImagen';
import '../../assets/panel.css';
import '../../assets/productos.css';

// Crear (CU-12, /admin/productos/nuevo) y editar (CU-13, /admin/productos/:id) un producto (F2.3).
// Valida en el formulario con las mismas reglas del backend antes de enviar; la API sigue decidiendo.
// Editar es actualización parcial: solo se envían los campos que cambiaron, y la imagen solo si se eligió otra.

const VACIO = { nombre: '', id_categoria: '', precio: '', existencias: '', descripcion: '' };
const CAMPOS = ['nombre', 'id_categoria', 'precio', 'existencias', 'descripcion', 'imagen'];

// Producto de la API → valores del formulario (todo como texto, que es lo que manejan los inputs).
function aFormulario(producto) {
  return {
    nombre: producto.nombre ?? '',
    id_categoria: String(producto.id_categoria ?? ''),
    precio: String(producto.precio ?? ''),
    existencias: String(producto.existencias ?? ''),
    descripcion: producto.descripcion ?? ''
  };
}

// Valores ya limpios, en el formato que espera la API.
function limpiar(form) {
  return {
    nombre: form.nombre.trim(),
    id_categoria: form.id_categoria,
    precio: form.precio.trim(),
    existencias: form.existencias.trim(),
    descripcion: form.descripcion.trim()
  };
}

// Campos que cambiaron respecto al producto guardado (los números se comparan como números).
function cambios(form, producto) {
  const original = limpiar(aFormulario(producto));
  const actual = limpiar(form);
  return Object.keys(actual).filter((campo) =>
    campo === 'precio' || campo === 'existencias'
      ? Number(actual[campo]) !== Number(original[campo])
      : actual[campo] !== original[campo]
  );
}

export default function ProductoFormPage() {
  const { id } = useParams();
  const esEdicion = id !== undefined;
  const navigate = useNavigate();
  const { mostrar } = useToast();

  const [categorias, setCategorias] = useState([]);
  const [producto, setProducto] = useState(null); // el guardado, al editar
  const [form, setForm] = useState(VACIO);
  const [imagen, setImagen] = useState(null);
  const [carga, setCarga] = useState({ estado: 'cargando', error: null, status: 0 });
  const [version, setVersion] = useState(0);
  const [tocados, setTocados] = useState({});
  const [errorApi, setErrorApi] = useState({ campo: null, mensaje: '' });
  const [enviando, setEnviando] = useState(false);

  // Carga las categorías (para la lista) y, al editar, el producto. Si algo falla, no se muestra el formulario.
  useEffect(() => {
    let cancelado = false;
    setCarga({ estado: 'cargando', error: null, status: 0 });

    Promise.all([listarCategorias(), esEdicion ? obtenerProductoAdmin(id) : Promise.resolve(null)])
      .then(([respCategorias, respProducto]) => {
        if (cancelado) return;
        setCategorias(Array.isArray(respCategorias?.data) ? respCategorias.data : []);
        if (respProducto) {
          setProducto(respProducto.data);
          setForm(aFormulario(respProducto.data));
        }
        setCarga({ estado: 'listo', error: null, status: 0 });
      })
      .catch((error) => {
        if (!cancelado) setCarga({ estado: 'error', error: error.message, status: error.status ?? 0 });
      });

    return () => {
      cancelado = true;
    };
  }, [esEdicion, id, version]);

  const errores = validarProducto({ ...form, imagen }, { imagenObligatoria: !esEdicion });
  const errorCampo = (campo) =>
    (tocados[campo] && errores[campo]) || (errorApi.campo === campo ? errorApi.mensaje : '');

  function cambiar(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errorApi.campo === name) setErrorApi({ campo: null, mensaje: '' });
  }

  function tocar(event) {
    const nombre = event.target.name || 'imagen';
    setTocados((prev) => ({ ...prev, [nombre]: true }));
  }

  function elegirImagen(archivo) {
    setImagen(archivo);
    setTocados((prev) => ({ ...prev, imagen: true }));
  }

  async function enviar(event) {
    event.preventDefault();
    setTocados(Object.fromEntries(CAMPOS.map((campo) => [campo, true])));
    setErrorApi({ campo: null, mensaje: '' });
    if (Object.keys(errores).length > 0) return;

    const valores = limpiar(form);
    const campos = esEdicion ? cambios(form, producto) : Object.keys(valores);
    if (esEdicion && campos.length === 0 && !imagen) {
      mostrar('No hiciste cambios.');
      return;
    }

    // FormData = cuerpo multipart/form-data, el formato que permite enviar el archivo junto con los datos.
    const datos = new FormData();
    campos.forEach((campo) => datos.append(campo, valores[campo]));
    if (imagen) datos.append('imagen', imagen);

    setEnviando(true);
    try {
      const { data } = esEdicion ? await actualizarProducto(producto.id_producto, datos) : await crearProducto(datos);
      mostrar(esEdicion ? `Se guardaron los cambios de ${data.nombre}.` : `Se creó ${data.nombre}.`);
      navigate('/admin/productos');
    } catch (error) {
      setEnviando(false);
      if (error.status === 404) {
        mostrar(error.message);
        navigate('/admin/productos');
        return;
      }
      // Se reacciona por `code` (API_CONTRATOS.md): el nombre repetido se marca en su campo.
      setErrorApi({ campo: error.code === 'PRODUCTO_DUPLICADO' ? 'nombre' : null, mensaje: error.message });
    }
  }

  const titulo = esEdicion ? 'Editar producto' : 'Nuevo producto';

  return (
    <main className="contenedor contenedor--panel">
      <Link to="/admin/productos" className="producto-form__volver">
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a productos
      </Link>

      <header className="panel__encabezado">
        <h1>{titulo}</h1>
        <p>
          {esEdicion
            ? 'Cambia los datos que necesites. Solo se guardan los campos que modifiques.'
            : 'Completa los datos del producto. Todos son obligatorios, salvo la descripción.'}
        </p>
      </header>

      {carga.estado === 'cargando' && (
        <p className="productos__mensaje" role="status">
          Cargando…
        </p>
      )}

      {carga.estado === 'error' && (
        <div className="productos__error">
          <p className="alerta alerta--error" role="alert">
            {carga.error}
          </p>
          {carga.status === 404 ? (
            <Link to="/admin/productos" className="btn btn--primario">
              Volver a productos
            </Link>
          ) : (
            <button type="button" className="btn btn--primario" onClick={() => setVersion((v) => v + 1)}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {carga.estado === 'listo' && (
        <form className="producto-form tarjeta" onSubmit={enviar} noValidate aria-label={titulo}>
          {errorApi.mensaje && !errorApi.campo && (
            <p className="alerta alerta--error producto-form__alerta" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              {errorApi.mensaje}
            </p>
          )}

          {esEdicion && producto && (
            <p className="producto-form__estado">
              Estado:{' '}
              <span className={`etiqueta ${producto.estado === 'activo' ? 'etiqueta--exito' : 'etiqueta--aviso'}`}>
                {producto.estado === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
            </p>
          )}

          <div className="producto-form__rejilla">
            <div className="producto-form__datos">
              <Campo id="producto-nombre" etiqueta="Nombre" error={errorCampo('nombre')}>
                {(props) => (
                  <input {...props} name="nombre" className="input" value={form.nombre} onChange={cambiar} onBlur={tocar} />
                )}
              </Campo>

              <Campo id="producto-categoria" etiqueta="Categoría" error={errorCampo('id_categoria')}>
                {(props) => (
                  <select
                    {...props}
                    name="id_categoria"
                    className="input"
                    value={form.id_categoria}
                    onChange={cambiar}
                    onBlur={tocar}
                  >
                    <option value="">Selecciona una categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id_categoria} value={String(c.id_categoria)}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </Campo>

              <div className="producto-form__par">
                <Campo id="producto-precio" etiqueta="Precio (COP)" error={errorCampo('precio')}>
                  {(props) => (
                    <input
                      {...props}
                      name="precio"
                      className="input"
                      inputMode="decimal"
                      placeholder="Ej.: 289000"
                      value={form.precio}
                      onChange={cambiar}
                      onBlur={tocar}
                    />
                  )}
                </Campo>

                <Campo id="producto-existencias" etiqueta="Existencias" error={errorCampo('existencias')}>
                  {(props) => (
                    <input
                      {...props}
                      name="existencias"
                      className="input"
                      inputMode="numeric"
                      placeholder="Ej.: 10"
                      value={form.existencias}
                      onChange={cambiar}
                      onBlur={tocar}
                    />
                  )}
                </Campo>
              </div>

              <Campo id="producto-descripcion" etiqueta="Descripción (opcional)" error={errorCampo('descripcion')}>
                {(props) => (
                  <textarea
                    {...props}
                    name="descripcion"
                    className="input producto-form__area"
                    rows={5}
                    value={form.descripcion}
                    onChange={cambiar}
                    onBlur={tocar}
                  />
                )}
              </Campo>
            </div>

            <CampoImagen
              id="producto-imagen"
              archivo={imagen}
              producto={esEdicion ? producto : null}
              error={errorCampo('imagen')}
              onElegir={elegirImagen}
              onBlur={tocar}
            />
          </div>

          <div className="producto-form__acciones">
            <Link to="/admin/productos" className="btn btn--suave">
              Cancelar
            </Link>
            <button type="submit" className="btn btn--primario" disabled={enviando}>
              <Save size={18} aria-hidden="true" />
              {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

// Etiqueta + control + error, con los atributos de accesibilidad conectados.
// children es una función que recibe { id, aria-invalid, aria-describedby } para el control.
function Campo({ id, etiqueta, error, children }) {
  const idError = `${id}-error`;
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? idError : undefined })}
      {error && (
        <p className="campo__error" id={idError}>
          {error}
        </p>
      )}
    </div>
  );
}

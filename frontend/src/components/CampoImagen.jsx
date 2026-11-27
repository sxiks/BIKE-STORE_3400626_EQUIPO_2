import { useEffect, useState } from 'react';
import { ImageUp } from 'lucide-react';
import ImagenProducto from './ImagenProducto';
import { IMAGEN_TIPOS } from '../utils/validaciones';
import '../assets/productos.css';

// Campo de imagen del formulario de productos (F2.3), con vista previa.
//   id: id del input · archivo: File elegido o null · producto: el producto que se edita (muestra su imagen actual)
//   error: mensaje junto al campo · onElegir(File | null) · onBlur: marca el campo como visitado
// La vista previa usa URL.createObjectURL (una URL temporal al archivo, sin subirlo) y se libera al cambiar
// de archivo o al salir de la página, para no dejar memoria ocupada.
export default function CampoImagen({ id, archivo, producto = null, error = '', onElegir, onBlur }) {
  const [vistaPrevia, setVistaPrevia] = useState(null);

  useEffect(() => {
    if (!archivo || typeof URL.createObjectURL !== 'function') {
      setVistaPrevia(null);
      return undefined;
    }
    const url = URL.createObjectURL(archivo);
    setVistaPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;

  return (
    <div className="campo campo-imagen">
      <span className="campo__etiqueta" id={`${id}-etiqueta`}>
        Imagen
      </span>

      <div className="campo-imagen__cuerpo">
        <div className="campo-imagen__vista">
          {vistaPrevia ? (
            <img src={vistaPrevia} alt={`Vista previa de ${archivo.name}`} />
          ) : producto ? (
            <ImagenProducto producto={producto} />
          ) : (
            <ImageUp size={32} aria-hidden="true" className="campo-imagen__icono" />
          )}
        </div>

        <div className="campo-imagen__control">
          <label className="btn btn--suave campo-imagen__boton" htmlFor={id}>
            <ImageUp size={18} aria-hidden="true" />
            {archivo || producto ? 'Cambiar imagen' : 'Elegir imagen'}
          </label>
          <input
            id={id}
            type="file"
            className="solo-lector"
            accept={IMAGEN_TIPOS.join(',')}
            aria-labelledby={`${id}-etiqueta`}
            aria-invalid={Boolean(error)}
            aria-describedby={`${idAyuda}${error ? ` ${idError}` : ''}`}
            onChange={(e) => onElegir(e.target.files?.[0] ?? null)}
            onBlur={onBlur}
          />
          <p className="campo-imagen__ayuda" id={idAyuda}>
            {archivo
              ? archivo.name
              : producto
                ? 'Si no eliges otra, se conserva la imagen actual.'
                : 'JPG, PNG o WEBP de hasta 2 MB.'}
          </p>
          {error && (
            <p className="campo__error" id={idError}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

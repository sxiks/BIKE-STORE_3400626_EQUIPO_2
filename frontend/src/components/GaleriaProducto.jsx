import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Star, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { agregarImagen, elegirPortada, quitarImagen, reordenarImagenes } from '../services/productos.service';
import { IMAGEN_TIPOS, errorImagen } from '../utils/validaciones';
import ImagenProducto from './ImagenProducto';
import DialogoConfirmacion from './DialogoConfirmacion';
import '../assets/galeria.css';

// Galería de imágenes de un producto en el formulario de edición (F2.4 · decisión M).
//   producto: ProductoDetalle (con `imagen` = portada e `imagenes` = galería) · onCambio(ProductoDetalle)
// Cada acción se guarda AL MOMENTO con su endpoint (no espera a "Guardar cambios"); la galería se reemplaza
// con el ProductoDetalle que responde la API.
// Reordenar: arrastrar y soltar con dnd-kit (mouse, pantalla táctil y teclado) o los botones de mover.
export const MAX_IMAGENES = 5; // portada + 4 (decisión M)

// Textos en español para el lector de pantalla mientras se arrastra (dnd-kit los trae en inglés).
const posicion = (imagenes, id) => imagenes.findIndex((i) => i.id_imagen === id) + 1;
function anuncios(imagenes) {
  return {
    onDragStart: ({ active }) => `Tomaste la imagen ${posicion(imagenes, active.id)} de ${imagenes.length}.`,
    onDragOver: ({ active, over }) =>
      over ? `La imagen ${posicion(imagenes, active.id)} está sobre la posición ${posicion(imagenes, over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `Soltaste la imagen en la posición ${posicion(imagenes, over.id)}.` : 'Soltaste la imagen fuera de la galería.',
    onDragCancel: () => 'Se canceló el movimiento.'
  };
}
const INSTRUCCIONES = {
  draggable:
    'Para mover una imagen, pulsa Espacio o Enter, muévela con las flechas y vuelve a pulsar Espacio o Enter para soltarla. Escape cancela.'
};

export default function GaleriaProducto({ producto, onCambio }) {
  const { mostrar } = useToast();
  const [ocupado, setOcupado] = useState(false);
  const [porQuitar, setPorQuitar] = useState(null);
  const [errorArchivo, setErrorArchivo] = useState('');
  const imagenes = producto.imagenes ?? [];
  const total = imagenes.length + 1; // + la portada
  const lleno = total >= MAX_IMAGENES;
  const idProducto = producto.id_producto;

  const sensores = useSensors(
    // distance: el arrastre empieza después de mover 6 px, así un clic en los botones no se toma como arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Ejecuta una acción de la API y reemplaza el producto con la respuesta.
  async function ejecutar(accion, mensaje) {
    setOcupado(true);
    try {
      const { data } = await accion();
      onCambio(data);
      if (mensaje) mostrar(mensaje);
      return true;
    } catch (error) {
      mostrar(error.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function subir(event) {
    const archivo = event.target.files?.[0];
    event.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    const error = errorImagen(archivo);
    setErrorArchivo(error ?? '');
    if (error) return;
    await ejecutar(() => agregarImagen(idProducto, archivo), 'Se agregó la imagen a la galería.');
  }

  // El orden se muestra de inmediato; si la API falla, se vuelve al anterior.
  async function reordenar(nuevas) {
    const anterior = producto;
    onCambio({ ...producto, imagenes: nuevas });
    const ok = await ejecutar(() => reordenarImagenes(idProducto, nuevas.map((i) => i.id_imagen)));
    if (!ok) onCambio(anterior);
  }

  function mover(indice, delta) {
    const destino = indice + delta;
    if (destino < 0 || destino >= imagenes.length) return;
    reordenar(arrayMove(imagenes, indice, destino));
  }

  function alSoltar({ active, over }) {
    if (!over || active.id === over.id) return;
    const desde = imagenes.findIndex((i) => i.id_imagen === active.id);
    const hasta = imagenes.findIndex((i) => i.id_imagen === over.id);
    reordenar(arrayMove(imagenes, desde, hasta));
  }

  async function confirmarQuitar() {
    await ejecutar(() => quitarImagen(idProducto, porQuitar.id_imagen), 'Se quitó la imagen de la galería.');
    setPorQuitar(null);
  }

  return (
    <section className="galeria tarjeta" aria-labelledby="galeria-titulo" aria-busy={ocupado}>
      <div className="galeria__encabezado">
        <div>
          <h2 id="galeria-titulo">Galería de imágenes</h2>
          <p>
            Hasta {MAX_IMAGENES} imágenes contando la portada. Arrastra las imágenes para ordenarlas. Los cambios de la
            galería se guardan al momento.
          </p>
        </div>
        <span className="etiqueta etiqueta--destacado galeria__contador">
          {total} de {MAX_IMAGENES}
        </span>
      </div>

      <div className="galeria__rejilla">
        <figure className="galeria__item galeria__item--portada">
          <div className="galeria__marco">
            <ImagenProducto producto={producto} />
          </div>
          <figcaption>
            <span className="etiqueta etiqueta--acento">
              <Star size={12} aria-hidden="true" /> Portada
            </span>
          </figcaption>
        </figure>

        <DndContext
          sensors={sensores}
          collisionDetection={closestCenter}
          onDragEnd={alSoltar}
          accessibility={{ announcements: anuncios(imagenes), screenReaderInstructions: INSTRUCCIONES }}
        >
          <SortableContext items={imagenes.map((i) => i.id_imagen)} strategy={rectSortingStrategy}>
            <ul className="galeria__lista" role="list" aria-label="Imágenes adicionales">
              {imagenes.map((img, indice) => (
                <ImagenOrdenable
                  key={img.id_imagen}
                  img={img}
                  indice={indice}
                  total={imagenes.length}
                  nombre={producto.nombre}
                  ocupado={ocupado}
                  onPortada={() => ejecutar(() => elegirPortada(idProducto, img.id_imagen), 'La imagen ahora es la portada.')}
                  onQuitar={() => setPorQuitar({ ...img, numero: indice + 1 })}
                  onMover={(delta) => mover(indice, delta)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {!lleno && (
          <div className="galeria__item galeria__agregar">
            <label className="galeria__agregar-boton" htmlFor="galeria-archivo">
              <ImagePlus size={28} aria-hidden="true" />
              <span>Agregar imagen</span>
            </label>
            <input
              id="galeria-archivo"
              type="file"
              className="solo-lector"
              accept={IMAGEN_TIPOS.join(',')}
              disabled={ocupado}
              aria-describedby={`galeria-archivo-ayuda${errorArchivo ? ' galeria-archivo-error' : ''}`}
              onChange={subir}
            />
            <span className="galeria__ayuda" id="galeria-archivo-ayuda">
              JPG, PNG o WEBP de hasta 2 MB
            </span>
          </div>
        )}
      </div>

      {lleno && <p className="galeria__nota">Llegaste al máximo de {MAX_IMAGENES} imágenes. Quita una para agregar otra.</p>}
      {errorArchivo && (
        <p className="campo__error" id="galeria-archivo-error" role="alert">
          {errorArchivo}
        </p>
      )}

      {porQuitar && (
        <DialogoConfirmacion
          titulo="Quitar imagen"
          mensaje={`¿Quitar la imagen ${porQuitar.numero} de la galería? El archivo se borra y no se puede recuperar.`}
          textoConfirmar="Sí, quitar"
          peligro
          ocupado={ocupado}
          onConfirmar={confirmarQuitar}
          onCancelar={() => setPorQuitar(null)}
        />
      )}
    </section>
  );
}

// Una imagen de la galería que se puede arrastrar (useSortable) o mover con botones.
function ImagenOrdenable({ img, indice, total, nombre, ocupado, onPortada, onQuitar, onMover }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: img.id_imagen,
    disabled: ocupado
  });
  const numero = indice + 1;
  const estilo = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={estilo}
      className={`galeria__item${isDragging ? ' galeria__item--arrastrando' : ''}`}
      data-testid={`galeria-imagen-${img.id_imagen}`}
    >
      <div className="galeria__marco">
        <ImagenProducto producto={{ imagen: img.imagen, nombre: `${nombre} (imagen ${numero})` }} />
        {/* Asa de arrastre: el único punto desde el que se arrastra, para no chocar con los botones. */}
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="icono-btn galeria__asa"
          aria-label={`Arrastrar imagen ${numero}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="galeria__acciones">
        <button
          type="button"
          className="icono-btn"
          aria-label={`Mover imagen ${numero} a la izquierda`}
          title="Mover a la izquierda"
          disabled={ocupado || indice === 0}
          onClick={() => onMover(-1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icono-btn"
          aria-label={`Mover imagen ${numero} a la derecha`}
          title="Mover a la derecha"
          disabled={ocupado || indice === total - 1}
          onClick={() => onMover(1)}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icono-btn"
          aria-label={`Hacer portada la imagen ${numero}`}
          title="Hacer portada"
          disabled={ocupado}
          onClick={onPortada}
        >
          <Star size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icono-btn icono-btn--peligro"
          aria-label={`Quitar imagen ${numero}`}
          title="Quitar"
          disabled={ocupado}
          onClick={onQuitar}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

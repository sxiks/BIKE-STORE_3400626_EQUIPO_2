import { useEffect, useId, useRef } from 'react';
import '../assets/dialogo.css';

/**
 * Diálogo de confirmación propio (reemplaza a window.confirm).
 * Solo recibe props: quien lo usa decide cuándo mostrarlo y qué hacer al confirmar.
 * Accesible: role="dialog", foco inicial en "Cancelar", Escape cierra, Tab no sale del diálogo
 * y al cerrarse el foco vuelve al botón que lo abrió.
 */
export default function DialogoConfirmacion({
  titulo,
  mensaje,
  textoConfirmar,
  textoCancelar = 'Cancelar',
  peligro = false,
  ocupado = false,
  onConfirmar,
  onCancelar
}) {
  const dialogoRef = useRef(null);
  const cancelarRef = useRef(null);
  const idTitulo = useId();
  const idMensaje = useId();

  // Al abrir: foco en la opción segura. Al cerrar: devolver el foco a quien lo tenía.
  useEffect(() => {
    const anterior = document.activeElement;
    cancelarRef.current?.focus();
    return () => {
      if (anterior instanceof HTMLElement) anterior.focus();
    };
  }, []);

  useEffect(() => {
    function alTeclear(evento) {
      if (evento.key === 'Escape' && !ocupado) {
        evento.preventDefault();
        onCancelar();
        return;
      }
      if (evento.key !== 'Tab') return;

      // Trampa de foco: Tab y Shift+Tab dan la vuelta entre los botones del diálogo.
      const botones = dialogoRef.current?.querySelectorAll('button:not(:disabled)');
      if (!botones?.length) {
        evento.preventDefault();
        return;
      }
      const primero = botones[0];
      const ultimo = botones[botones.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [ocupado, onCancelar]);

  return (
    <div
      className="dialogo__fondo"
      onMouseDown={(evento) => {
        // Clic en el fondo (no dentro del cuadro) = cancelar.
        if (evento.target === evento.currentTarget && !ocupado) onCancelar();
      }}
    >
      <div
        ref={dialogoRef}
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idMensaje}
      >
        <h2 id={idTitulo} className="dialogo__titulo">
          {titulo}
        </h2>
        <p id={idMensaje} className="dialogo__mensaje">
          {mensaje}
        </p>
        <div className="dialogo__acciones">
          <button ref={cancelarRef} type="button" className="btn btn--suave" disabled={ocupado} onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button
            type="button"
            className={`btn ${peligro ? 'btn--peligro' : 'btn--primario'}`}
            disabled={ocupado}
            onClick={onConfirmar}
          >
            {ocupado ? 'Guardando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

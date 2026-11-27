import { Moon, Sun } from 'lucide-react';
import { useTema } from '../context/TemaContext';

// Botón para cambiar entre el tema oscuro y el claro. En oscuro muestra el sol (pasar a claro) y viceversa.
export default function BotonTema() {
  const { tema, alternarTema } = useTema();
  const oscuro = tema === 'oscuro';
  return (
    <button
      type="button"
      className="icono-btn"
      onClick={alternarTema}
      aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={oscuro ? 'Tema claro' : 'Tema oscuro'}
    >
      {oscuro ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

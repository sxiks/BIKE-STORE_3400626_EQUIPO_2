import { Check, Circle } from 'lucide-react';
import { reglasPassword } from '../utils/validaciones';

// Lista de las reglas D7 que se marcan mientras se escribe (registro y restablecer).
export default function ReglasPassword({ password, id }) {
  return (
    <ul className="reglas-password" id={id}>
      {reglasPassword(password).map((regla) => (
        <li
          key={regla.id}
          className={`reglas-password__item${regla.cumple ? ' reglas-password__item--cumple' : ''}`}
        >
          {regla.cumple ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
          {regla.texto}
          <span className="solo-lector">{regla.cumple ? ': cumple' : ': pendiente'}</span>
        </li>
      ))}
    </ul>
  );
}

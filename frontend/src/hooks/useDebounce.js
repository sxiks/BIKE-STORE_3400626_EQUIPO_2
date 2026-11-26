import { useEffect, useState } from 'react';

// Devuelve `valor` con retraso: solo cambia cuando pasan `retardo` ms sin que el valor original cambie.
// Sirve para no llamar a la API en cada tecla de un buscador.
export function useDebounce(valor, retardo = 350) {
  const [valorRetrasado, setValorRetrasado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setValorRetrasado(valor), retardo);
    return () => clearTimeout(temporizador);
  }, [valor, retardo]);

  return valorRetrasado;
}

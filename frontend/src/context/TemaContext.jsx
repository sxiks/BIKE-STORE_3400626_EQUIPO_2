import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getTema, setTema } from '../utils/storage';

const TemaContext = createContext(null);

// Tema de la interfaz (rediseño): 'oscuro' por defecto o 'claro'.
// Se aplica como <html data-tema="…">: tokens.css define los colores de cada tema.
// index.html aplica el tema guardado antes de que React arranque, para evitar un destello del otro tema.
export function TemaProvider({ children }) {
  const [tema, setTemaEstado] = useState(getTema);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    // Color de la barra del navegador en el celular: el fondo de cada tema (ver tokens.css).
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'claro' ? '#f6f7f9' : '#101114');
    setTema(tema);
  }, [tema]);

  const alternarTema = useCallback(() => {
    setTemaEstado((actual) => (actual === 'oscuro' ? 'claro' : 'oscuro'));
  }, []);

  const valor = useMemo(() => ({ tema, alternarTema }), [tema, alternarTema]);

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error('useTema debe usarse dentro de <TemaProvider>');
  return ctx;
}

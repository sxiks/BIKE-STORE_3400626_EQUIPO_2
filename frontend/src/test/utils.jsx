// Utilidades compartidas por las pruebas.
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TemaProvider } from "../context/TemaContext";
import { ToastProvider } from "../context/ToastContext";
import { AuthProvider } from "../context/AuthContext";
import { AppRutas } from "../App";

// Renderiza un componente con los proveedores globales de la app (Router, Tema, Toasts y Sesión).
export function renderConProveedores(ui, { ruta = "/" } = {}) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <TemaProvider>
        <ToastProvider>
          <AuthProvider>{ui}</AuthProvider>
        </ToastProvider>
      </TemaProvider>
    </MemoryRouter>
  );
}

// Renderiza la aplicación completa (mismas rutas que App.jsx) empezando en `ruta`.
export function renderApp(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AppRutas />
    </MemoryRouter>
  );
}

// Respuesta simulada de fetch con el formato de la API.
export function respuesta(status, cuerpo) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(cuerpo) });
}

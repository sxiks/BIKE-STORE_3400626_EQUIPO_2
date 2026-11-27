// Utilidades compartidas por las pruebas.
import { expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TemaProvider } from "../context/TemaContext";
import { ToastProvider } from "../context/ToastContext";
import { AuthProvider } from "../context/AuthContext";
import { CarritoProvider } from "../context/CarritoContext";
import { AppRutas } from "../App";

// Renderiza un componente con los proveedores globales de la app (Router, Tema, Toasts, Sesión y Carrito).
export function renderConProveedores(ui, { ruta = "/" } = {}) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <TemaProvider>
        <ToastProvider>
          <AuthProvider>
            <CarritoProvider>{ui}</CarritoProvider>
          </AuthProvider>
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

// La tienda pide las categorías y los productos al montarse. Una prueba que solo revisa la barra, el tema o
// la sesión espera a que esas respuestas lleguen antes de terminar: si llegan después, actualizan la pantalla
// fuera de la prueba y React avisa con "not wrapped in act(...)".
//   productos: false si la prueba deja el catálogo cargando a propósito (solo espera las categorías).
export async function esperarTienda({ productos = true } = {}) {
  await waitFor(() => expect(within(screen.getByRole("group", { name: "Categorías" })).getAllByRole("button").length).toBeGreaterThan(1));
  if (productos) await screen.findAllByTestId(/^producto-\d+$/);
}

// Respuesta simulada de fetch con el formato de la API.
export function respuesta(status, cuerpo) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(cuerpo) });
}

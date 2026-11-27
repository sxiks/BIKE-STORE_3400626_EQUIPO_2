// Rediseño (PR 2): tienda con destacado y búsqueda, y barra lateral del admin.
// La API se simula con un fetch falso: estas pruebas no necesitan el backend encendido.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";

const ADMIN = { id_usuario: 1, nombre: "Admin Tienda", email: "admin@prueba.local", rol: "admin", estado: "activo" };

let fetchMock;

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Tienda", () => {
  it("muestra el producto destacado y lo agrega al carrito", () => {
    renderApp("/");

    const destacado = within(screen.getByRole("region", { name: "Café de Huila 500 g" }));
    expect(destacado.getByText("Destacado")).toBeInTheDocument();

    fireEvent.click(destacado.getByRole("button", { name: /agregar café de huila 500 g al carrito desde destacados/i }));

    expect(screen.getByTestId("contador-carrito")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Abrir carrito (1 unidades)" })).toBeInTheDocument();
  });

  it("la búsqueda filtra el catálogo por nombre, sin importar mayúsculas ni tildes", () => {
    renderApp("/");

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar productos" }), { target: { value: "cafe" } });

    expect(screen.getByRole("heading", { name: 'Resultados para "cafe"' })).toBeInTheDocument();
    expect(screen.getByTestId("producto-1")).toBeInTheDocument();
    expect(screen.queryByTestId("producto-2")).not.toBeInTheDocument();
    expect(screen.getByText("1 producto")).toBeInTheDocument();
    // Mientras se busca, el destacado se oculta para dejar a la vista los resultados
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
  });

  it("si la búsqueda no encuentra nada, lo explica", () => {
    renderApp("/");

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar productos" }), { target: { value: "bicicleta voladora" } });

    expect(screen.getByText(/ningún producto coincide con tu búsqueda/i)).toBeInTheDocument();
  });

  it("marca con una insignia los productos con pocas unidades", () => {
    renderApp("/");

    expect(within(screen.getByTestId("producto-2")).getByText("Últimas 3")).toBeInTheDocument(); // Panela, stock 3
    expect(within(screen.getByTestId("producto-3")).queryByText(/últimas/i)).not.toBeInTheDocument(); // Arepa, stock 12
  });
});

describe("Barra lateral del admin", () => {
  beforeEach(() => {
    localStorage.setItem("bikestore_token", "token-admin");
    localStorage.setItem("bikestore_user", JSON.stringify(ADMIN));
    fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: ADMIN }));
  });

  it("muestra las secciones de los próximos sprints sin enlace", async () => {
    renderApp("/admin");

    const lateral = within(await screen.findByRole("navigation", { name: "Administración" }));
    expect(lateral.getByText("Productos")).toBeInTheDocument();
    expect(lateral.getByText("Sprint 2")).toBeInTheDocument();
    expect(lateral.queryByRole("link", { name: /productos/i })).not.toBeInTheDocument();
  });

  it("el botón de menú (pantallas angostas) abre y cierra la navegación", async () => {
    renderApp("/admin");
    await screen.findByRole("heading", { name: "Panel de administración" });

    const boton = screen.getByRole("button", { name: "Abrir menú" });
    expect(boton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(boton);
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar menú" }));
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
  });

  it("muestra el nombre del admin y el botón de tema", async () => {
    renderApp("/admin");
    await screen.findByRole("heading", { name: "Panel de administración" });

    expect(screen.getByTestId("usuario-sesion")).toHaveTextContent("Admin Tienda");
    expect(screen.getByRole("button", { name: /cambiar a tema/i })).toBeInTheDocument();
  });
});

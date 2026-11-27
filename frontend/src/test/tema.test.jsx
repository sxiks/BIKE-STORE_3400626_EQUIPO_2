// Rediseño · tema oscuro y claro (TemaContext + BotonTema).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderApp } from "./utils";

// La tienda pide el catálogo a la API: se simula para que estas pruebas solo vean las llamadas de sesión.
vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());

const html = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  delete html().dataset.tema;
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("sin red en esta prueba"))));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Tema de la interfaz", () => {
  it("arranca en oscuro y el botón ofrece pasar a claro", () => {
    renderApp("/");

    expect(html().dataset.tema).toBe("oscuro");
    expect(screen.getByRole("button", { name: "Cambiar a tema claro" })).toBeInTheDocument();
  });

  it("al pulsar el botón cambia a claro, lo aplica en <html> y lo guarda", () => {
    renderApp("/");
    fireEvent.click(screen.getByRole("button", { name: "Cambiar a tema claro" }));

    expect(html().dataset.tema).toBe("claro");
    expect(localStorage.getItem("bikestore_tema")).toBe("claro");
    expect(screen.getByRole("button", { name: "Cambiar a tema oscuro" })).toBeInTheDocument();
  });

  it("recuerda el tema elegido al volver a abrir la app", () => {
    localStorage.setItem("bikestore_tema", "claro");
    renderApp("/login");

    expect(html().dataset.tema).toBe("claro");
    expect(screen.getByRole("button", { name: "Cambiar a tema oscuro" })).toBeInTheDocument();
  });

  it("un valor guardado inválido vuelve al tema oscuro", () => {
    localStorage.setItem("bikestore_tema", "morado");
    renderApp("/");

    expect(html().dataset.tema).toBe("oscuro");
    expect(localStorage.getItem("bikestore_tema")).toBe("oscuro");
  });

  it("el botón de tema está en todas las vistas, también en las de acceso", () => {
    renderApp("/registro");
    expect(screen.getByRole("button", { name: /cambiar a tema/i })).toBeInTheDocument();
  });
});

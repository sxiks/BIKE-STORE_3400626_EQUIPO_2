// Rediseño (PR 2): tienda con destacado y búsqueda, y barra lateral del admin.
// Desde F2.2 la tienda usa el catálogo de prueba con los productos reales de la semilla (fixtures/catalogo.js).
// La API se simula con un fetch falso: estas pruebas no necesitan el backend encendido.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";
import { PRODUCTOS, agotado, conMasStock, conPocoStock, masCaroDisponible } from "./fixtures/catalogo";

// La tienda pide el catálogo a la API: se simula para que estas pruebas solo vean las llamadas de sesión.
vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());

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
  const destacado = masCaroDisponible();
  const cargar = async () => {
    renderApp("/");
    await screen.findByRole("region", { name: destacado.nombre });
  };

  it("muestra como destacado el producto disponible más caro y lo agrega al carrito", async () => {
    await cargar();

    const bloque = within(screen.getByRole("region", { name: destacado.nombre }));
    expect(bloque.getByText("Destacado")).toBeInTheDocument();

    fireEvent.click(bloque.getByRole("button", { name: `Agregar ${destacado.nombre} al carrito desde destacados` }));

    expect(screen.getByTestId("contador-carrito")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Abrir carrito (1 unidades)" })).toBeInTheDocument();
  });

  it("la búsqueda filtra el catálogo por nombre, sin importar mayúsculas ni tildes", async () => {
    await cargar();
    const conTilde = PRODUCTOS.find((p) => p.disponible && /[áéíóú]/i.test(p.nombre)); // ej. "MTB Páramo 27.5"
    const termino = conTilde.nombre.split(" ")[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar productos" }), { target: { value: termino } });

    expect(screen.getByRole("heading", { name: `Resultados para "${termino}"` })).toBeInTheDocument();
    expect(screen.getByTestId(`producto-${conTilde.id_producto}`)).toBeInTheDocument();
    // Mientras se busca, el destacado se oculta para dejar a la vista los resultados
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
  });

  it("si la búsqueda no encuentra nada, lo explica", async () => {
    await cargar();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar productos" }), { target: { value: "bicicleta voladora" } });

    expect(screen.getByText(/ningún producto coincide con tu búsqueda/i)).toBeInTheDocument();
  });

  it("marca con una insignia los productos con pocas unidades y los agotados", async () => {
    await cargar();
    const poco = conPocoStock();
    const sinStock = agotado();
    const amplio = conMasStock();

    expect(within(screen.getByTestId(`producto-${poco.id_producto}`)).getByText(`Últimas ${poco.existencias}`)).toBeInTheDocument();
    expect(within(screen.getByTestId(`producto-${sinStock.id_producto}`)).getAllByText("Agotado").length).toBeGreaterThan(0);
    expect(within(screen.getByTestId(`producto-${amplio.id_producto}`)).queryByText(/últimas/i)).not.toBeInTheDocument();
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
    expect(lateral.getByText("Pedidos")).toBeInTheDocument();
    expect(lateral.getByText("Sprint 3")).toBeInTheDocument();
    expect(lateral.queryByRole("link", { name: /pedidos/i })).not.toBeInTheDocument();
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

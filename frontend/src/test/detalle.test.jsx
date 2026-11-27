// F2.4 · Detalle del producto en la tienda (/producto/:id): galería, datos y agregar al carrito local.
// La API se simula con el catálogo de prueba (fixtures/catalogo.js).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRutas } from "../App";
import { ApiError } from "../services/api";
import { obtenerProducto } from "../services/productos.service";
import { agotado, conGaleria, conStockMinimo, galeriaDe, unInactivo } from "./fixtures/catalogo";

vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());

const renderEn = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AppRutas />
    </MemoryRouter>
  );
const imagenPrincipal = () => screen.getByRole("article").querySelector(".detalle__principal img");

beforeEach(() => {
  localStorage.clear();
});

describe("Detalle del producto", () => {
  it("desde la tienda, el nombre de la tarjeta lleva al detalle", async () => {
    const producto = conGaleria();
    renderEn("/");
    const tarjeta = within(await screen.findByTestId(`producto-${producto.id_producto}`));

    // La imagen y el nombre llevan al mismo sitio; se usa el enlace del nombre (dentro del título).
    fireEvent.click(within(tarjeta.getByRole("heading")).getByRole("link", { name: producto.nombre }));

    expect(await screen.findByRole("heading", { level: 1, name: producto.nombre })).toBeInTheDocument();
    expect(obtenerProducto).toHaveBeenCalledWith(String(producto.id_producto));
  });

  it("muestra categoría, precio, stock y descripción, con enlace de vuelta a la tienda", async () => {
    const producto = conGaleria();
    renderEn(`/producto/${producto.id_producto}`);

    await screen.findByRole("heading", { level: 1, name: producto.nombre });
    const articulo = within(screen.getByRole("article"));
    expect(articulo.getByText(producto.categoria)).toBeInTheDocument();
    expect(articulo.getByText(producto.descripcion)).toBeInTheDocument();
    expect(articulo.getByText(`Stock disponible: ${producto.existencias}`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a la tienda" })).toHaveAttribute("href", "/");
  });

  it("la portada va primero y las miniaturas cambian la imagen grande", async () => {
    const producto = conGaleria();
    const galeria = galeriaDe(producto.id_producto);
    renderEn(`/producto/${producto.id_producto}`);
    await screen.findByRole("heading", { level: 1, name: producto.nombre });

    const miniaturas = within(screen.getByRole("group", { name: "Imágenes del producto" })).getAllByRole("button");
    expect(miniaturas).toHaveLength(galeria.length + 1);
    expect(miniaturas[0]).toHaveAttribute("aria-pressed", "true");
    expect(imagenPrincipal().getAttribute("src")).toContain(producto.imagen);

    fireEvent.click(screen.getByRole("button", { name: `Ver imagen 2 de ${galeria.length + 1}` }));

    expect(imagenPrincipal().getAttribute("src")).toContain(galeria[0].imagen);
    expect(screen.getByRole("button", { name: `Ver imagen 2 de ${galeria.length + 1}` })).toHaveAttribute("aria-pressed", "true");
  });

  it("sin galería no muestra miniaturas", async () => {
    const [sinGaleria] = conStockMinimo(1).filter((p) => p.id_producto !== conGaleria().id_producto);
    renderEn(`/producto/${sinGaleria.id_producto}`);
    await screen.findByRole("heading", { level: 1, name: sinGaleria.nombre });

    expect(screen.queryByRole("group", { name: "Imágenes del producto" })).not.toBeInTheDocument();
  });

  it("agregar al carrito suma la cantidad elegida al contador de la barra", async () => {
    const [producto] = conStockMinimo(3);
    renderEn(`/producto/${producto.id_producto}`);
    await screen.findByRole("heading", { level: 1, name: producto.nombre });

    fireEvent.change(screen.getByLabelText(`Cantidad a agregar de ${producto.nombre}`), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: `Agregar ${producto.nombre} al carrito` }));

    expect(screen.getByRole("button", { name: "Abrir carrito (2 unidades)" })).toBeInTheDocument();
  });

  it("un producto agotado no se puede agregar", async () => {
    const sinStock = agotado();
    renderEn(`/producto/${sinStock.id_producto}`);
    await screen.findByRole("heading", { level: 1, name: sinStock.nombre });

    expect(screen.getByRole("button", { name: `Agregar ${sinStock.nombre} al carrito` })).toBeDisabled();
    expect(screen.getByText("Sin unidades disponibles")).toBeInTheDocument();
  });

  it("un producto inactivo o inexistente muestra 'Producto no disponible' con enlace a la tienda", async () => {
    renderEn(`/producto/${unInactivo().id_producto}`);

    expect(await screen.findByRole("heading", { level: 1, name: "Producto no disponible" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a la tienda" })).toHaveAttribute("href", "/");
  });

  it("si la API no responde, muestra el error y permite reintentar", async () => {
    const producto = conGaleria();
    obtenerProducto.mockRejectedValueOnce(new ApiError("No se pudo conectar con el servidor."));
    renderEn(`/producto/${producto.id_producto}`);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { level: 1, name: producto.nombre })).toBeInTheDocument();
  });
});

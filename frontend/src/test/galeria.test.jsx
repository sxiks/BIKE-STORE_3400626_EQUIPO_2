// F2.4 · Galería de imágenes en el formulario de edición (decisión M): agregar, quitar, elegir portada y reordenar.
// El servicio simulado guarda la galería mientras dura cada prueba (fixtures/catalogo.js, galeriaSimulada).
// Arrastrar y soltar (dnd-kit) necesita medidas reales de pantalla que jsdom no tiene: se prueba en el navegador
// (ver la verificación del PR). Aquí se prueba el mismo reordenamiento con los botones de mover.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";
import { ApiError } from "../services/api";
import * as servicio from "../services/productos.service";
import { MAX_IMAGENES, conGaleria, galeriaDe, servicioSimulado } from "./fixtures/catalogo";

vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());

const ADMIN = { id_usuario: 1, nombre: "Admin Tienda", email: "admin@prueba.local", rol: "admin", estado: "activo" };
const FUNCIONES = ["obtenerProductoAdmin", "agregarImagen", "quitarImagen", "elegirPortada", "reordenarImagenes"];
const producto = conGaleria();
const inicial = galeriaDe(producto.id_producto);
let fetchMock;

async function abrir() {
  localStorage.setItem("bikestore_token", "token-admin");
  localStorage.setItem("bikestore_user", JSON.stringify(ADMIN));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: ADMIN }));
  renderApp(`/admin/productos/${producto.id_producto}`);
  return within(await screen.findByRole("region", { name: "Galería de imágenes" }));
}

// Imágenes de la galería en pantalla, en orden (por su id).
const idsEnPantalla = () =>
  screen.getAllByTestId(/^galeria-imagen-\d+$/).map((el) => Number(el.dataset.testid.replace("galeria-imagen-", "")));
const archivo = (tipo = "image/png", nombre = "nueva.png") => new File(["x"], nombre, { type: tipo });
const subir = (galeria, f) => fireEvent.change(galeria.getByLabelText("Agregar imagen"), { target: { files: [f] } });

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  const base = servicioSimulado();
  FUNCIONES.forEach((nombre) => servicio[nombre].mockImplementation(base[nombre].getMockImplementation()));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Galería en la edición", () => {
  it("muestra la portada, las imágenes adicionales en orden y el contador", async () => {
    const galeria = await abrir();

    expect(galeria.getByText("Portada")).toBeInTheDocument();
    expect(idsEnPantalla()).toEqual(inicial.map((i) => i.id_imagen));
    expect(galeria.getByText(`${inicial.length + 1} de ${MAX_IMAGENES}`)).toBeInTheDocument();
    expect(galeria.getByText(/se guardan al momento/i)).toBeInTheDocument();
  });

  it("no aparece al crear un producto nuevo", async () => {
    localStorage.setItem("bikestore_token", "token-admin");
    localStorage.setItem("bikestore_user", JSON.stringify(ADMIN));
    fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: ADMIN }));
    renderApp("/admin/productos/nuevo");
    await screen.findByRole("form");

    expect(screen.queryByRole("region", { name: "Galería de imágenes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar producto" })).not.toBeInTheDocument();
  });

  it("agregar sube la imagen al momento y la muestra al final", async () => {
    const galeria = await abrir();

    subir(galeria, archivo("image/webp", "lateral.webp"));

    await waitFor(() => expect(idsEnPantalla()).toHaveLength(inicial.length + 1));
    expect(servicio.agregarImagen).toHaveBeenCalledWith(producto.id_producto, expect.any(File));
    expect(screen.getByText("Se agregó la imagen a la galería.")).toBeInTheDocument();
    expect(galeria.getByText(`${inicial.length + 2} de ${MAX_IMAGENES}`)).toBeInTheDocument();
  });

  it("un archivo de otro formato se rechaza sin llamar a la API", async () => {
    const galeria = await abrir();

    subir(galeria, archivo("image/gif", "animada.gif"));

    expect(await screen.findByText(/formato de imagen no permitido/i)).toBeInTheDocument();
    expect(servicio.agregarImagen).not.toHaveBeenCalled();
  });

  it(`al llegar a ${MAX_IMAGENES} imágenes desaparece "Agregar imagen" y se explica el límite`, async () => {
    const galeria = await abrir();

    for (let i = inicial.length + 1; i < MAX_IMAGENES; i++) {
      subir(galeria, archivo());
      await waitFor(() => expect(idsEnPantalla()).toHaveLength(i));
    }

    expect(galeria.queryByLabelText("Agregar imagen")).not.toBeInTheDocument();
    expect(galeria.getByText(/llegaste al máximo de 5 imágenes/i)).toBeInTheDocument();
    expect(galeria.getByText(`${MAX_IMAGENES} de ${MAX_IMAGENES}`)).toBeInTheDocument();
  });

  it("quitar pide confirmación y saca la imagen", async () => {
    const galeria = await abrir();
    const [primera] = inicial;

    fireEvent.click(galeria.getByRole("button", { name: "Quitar imagen 1" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, quitar" }));

    await waitFor(() => expect(idsEnPantalla()).not.toContain(primera.id_imagen));
    expect(servicio.quitarImagen).toHaveBeenCalledWith(producto.id_producto, primera.id_imagen);
  });

  it("hacer portada intercambia las imágenes", async () => {
    const galeria = await abrir();
    const [primera] = inicial;

    fireEvent.click(galeria.getByRole("button", { name: "Hacer portada la imagen 1" }));

    expect(await screen.findByText("La imagen ahora es la portada.")).toBeInTheDocument();
    expect(servicio.elegirPortada).toHaveBeenCalledWith(producto.id_producto, primera.id_imagen);
    // La casilla "Portada" de la galería ahora muestra el archivo que era la imagen 1.
    const portada = galeria.getByText("Portada").closest("figure").querySelector("img");
    expect(portada.getAttribute("src")).toContain(primera.imagen);
  });

  it("mover a la derecha reordena al momento y envía todos los ids en el orden nuevo", async () => {
    const galeria = await abrir();
    const [a, b] = inicial.map((i) => i.id_imagen);

    expect(galeria.getByRole("button", { name: "Mover imagen 1 a la izquierda" })).toBeDisabled();
    fireEvent.click(galeria.getByRole("button", { name: "Mover imagen 1 a la derecha" }));

    expect(idsEnPantalla()).toEqual([b, a]); // se ve de inmediato
    await waitFor(() => expect(servicio.reordenarImagenes).toHaveBeenCalledWith(producto.id_producto, [b, a]));
  });

  it("si reordenar falla, vuelve al orden anterior y muestra el error", async () => {
    servicio.reordenarImagenes.mockRejectedValueOnce(new ApiError("No se pudo conectar con el servidor."));
    const galeria = await abrir();

    fireEvent.click(galeria.getByRole("button", { name: "Mover imagen 1 a la derecha" }));

    expect(await screen.findByText("No se pudo conectar con el servidor.")).toBeInTheDocument();
    expect(idsEnPantalla()).toEqual(inicial.map((i) => i.id_imagen));
  });

  it("cada imagen tiene un asa para arrastrarla, con instrucciones de teclado en español", async () => {
    const galeria = await abrir();

    const asa = galeria.getByRole("button", { name: "Arrastrar imagen 1" });
    expect(asa).toHaveAttribute("aria-roledescription");
    // dnd-kit conecta el asa con las instrucciones por aria-describedby (las monta después del primer render).
    await waitFor(() => expect(asa).toHaveAccessibleDescription(/pulsa Espacio o Enter, muévela con las flechas/));
  });
});

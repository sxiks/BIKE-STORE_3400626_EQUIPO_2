// F2.4 · Categorías del administrador (decisión M): crear, renombrar y eliminar las que no tienen productos.
// El servicio se simula con categoriasSimulado() (fixtures/catalogo.js), que aplica las reglas del backend.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";
import { ApiError } from "../services/api";
import * as servicio from "../services/categorias.service";
import { categoriaConProductos, categoriasAdmin, categoriasSimulado } from "./fixtures/catalogo";

vi.mock("../services/categorias.service", async () => (await import("./fixtures/catalogo")).categoriasSimulado());
vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());

const ADMIN = { id_usuario: 1, nombre: "Admin Tienda", email: "admin@prueba.local", rol: "admin", estado: "activo" };
const FUNCIONES = ["listarCategoriasAdmin", "crearCategoria", "renombrarCategoria", "eliminarCategoria"];
let fetchMock;

function conSesion() {
  localStorage.setItem("bikestore_token", "token-admin");
  localStorage.setItem("bikestore_user", JSON.stringify(ADMIN));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: ADMIN }));
}

async function abrir() {
  conSesion();
  renderApp("/admin/categorias");
  return screen.findByRole("list", { name: "Categorías" });
}

const fila = (nombre) =>
  within(screen.getByRole("list", { name: "Categorías" }))
    .getAllByRole("listitem")
    .find((li) => within(li).queryByText(nombre, { exact: true }));
const nombresEnPantalla = () =>
  within(screen.getByRole("list", { name: "Categorías" }))
    .getAllByRole("listitem")
    .map((li) => li.querySelector(".categorias__nombre")?.textContent);

async function crear(nombre) {
  fireEvent.change(screen.getByLabelText("Nueva categoría"), { target: { value: nombre } });
  fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));
  await screen.findByText(`Se creó la categoría ${nombre.trim()}.`);
}

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  // Estado nuevo en cada prueba (las categorías creadas o borradas no pasan a la siguiente).
  const base = categoriasSimulado();
  FUNCIONES.forEach((nombre) => servicio[nombre].mockImplementation(base[nombre].getMockImplementation()));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Acceso y listado", () => {
  it("la barra lateral y el inicio del panel llevan a Categorías", async () => {
    conSesion();
    renderApp("/admin");

    fireEvent.click(within(await screen.findByRole("main")).getByRole("link", { name: "Categorías" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeInTheDocument();
    const lateral = within(screen.getByRole("navigation", { name: "Administración" }));
    expect(lateral.getByRole("link", { name: "Categorías" })).toHaveAttribute("aria-current", "page");
  });

  it("muestra cada categoría con su número de productos, por nombre", async () => {
    await abrir();

    expect(nombresEnPantalla()).toEqual(categoriasAdmin().map((c) => c.nombre));
    for (const c of categoriasAdmin()) {
      expect(within(fila(c.nombre)).getByText(c.total_productos === 1 ? "1 producto" : `${c.total_productos} productos`)).toBeInTheDocument();
    }
  });

  it("no deja eliminar una categoría con productos (botón deshabilitado y explicado)", async () => {
    await abrir();
    const c = categoriaConProductos();

    const boton = within(fila(c.nombre)).getByRole("button", { name: `Eliminar ${c.nombre}` });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAccessibleDescription(`${c.total_productos} productos`);
  });

  it("si la carga falla, permite reintentar", async () => {
    servicio.listarCategoriasAdmin.mockRejectedValueOnce(new ApiError("No se pudo conectar con el servidor."));
    conSesion();
    renderApp("/admin/categorias");

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("list", { name: "Categorías" })).toBeInTheDocument();
  });
});

describe("Crear", () => {
  it("crea la categoría, la ubica en orden alfabético y limpia el campo", async () => {
    await abrir();

    await crear("  Repuestos  ");

    expect(servicio.crearCategoria).toHaveBeenCalledWith("Repuestos");
    expect(within(fila("Repuestos")).getByText("Sin productos")).toBeInTheDocument();
    expect(nombresEnPantalla()).toEqual([...nombresEnPantalla()].sort((a, b) => a.localeCompare(b, "es")));
    expect(screen.getByLabelText("Nueva categoría")).toHaveValue("");
  });

  it("valida el nombre vacío sin llamar a la API", async () => {
    await abrir();

    fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));

    expect(screen.getByText("Escribe el nombre de la categoría")).toBeInTheDocument();
    expect(servicio.crearCategoria).not.toHaveBeenCalled();
  });

  it("CATEGORIA_DUPLICADA se marca junto al campo", async () => {
    await abrir();
    const existente = categoriasAdmin()[0];

    fireEvent.change(screen.getByLabelText("Nueva categoría"), { target: { value: existente.nombre.toUpperCase() } });
    fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));

    const error = await screen.findByText("Ya existe una categoría con ese nombre");
    expect(screen.getByLabelText("Nueva categoría")).toHaveAttribute("aria-describedby", error.id);
  });
});

describe("Renombrar", () => {
  it("Renombrar abre el campo con el nombre actual y Guardar lo cambia", async () => {
    await abrir();
    const c = categoriaConProductos();

    fireEvent.click(screen.getByRole("button", { name: `Renombrar ${c.nombre}` }));
    const campo = screen.getByLabelText(`Nuevo nombre de ${c.nombre}`);
    expect(campo).toHaveValue(c.nombre);
    expect(campo).toHaveFocus();
    fireEvent.change(campo, { target: { value: `${c.nombre} y más` } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(`La categoría ahora se llama ${c.nombre} y más.`)).toBeInTheDocument();
    expect(servicio.renombrarCategoria).toHaveBeenCalledWith(c.id_categoria, `${c.nombre} y más`);
    expect(fila(`${c.nombre} y más`)).toBeTruthy();
  });

  it("Escape cancela sin llamar a la API", async () => {
    await abrir();
    const c = categoriaConProductos();

    fireEvent.click(screen.getByRole("button", { name: `Renombrar ${c.nombre}` }));
    fireEvent.keyDown(screen.getByLabelText(`Nuevo nombre de ${c.nombre}`), { key: "Escape" });

    expect(screen.queryByLabelText(`Nuevo nombre de ${c.nombre}`)).not.toBeInTheDocument();
    expect(servicio.renombrarCategoria).not.toHaveBeenCalled();
  });

  it("el nombre de otra categoría muestra CATEGORIA_DUPLICADA en el campo", async () => {
    await abrir();
    const [a, b] = categoriasAdmin();

    fireEvent.click(screen.getByRole("button", { name: `Renombrar ${a.nombre}` }));
    fireEvent.change(screen.getByLabelText(`Nuevo nombre de ${a.nombre}`), { target: { value: b.nombre } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Ya existe una categoría con ese nombre")).toBeInTheDocument();
    expect(screen.getByLabelText(`Nuevo nombre de ${a.nombre}`)).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Eliminar", () => {
  it("una categoría sin productos se elimina después de confirmar", async () => {
    await abrir();
    await crear("Temporal");

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Temporal" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, eliminar" }));

    expect(await screen.findByText("Se eliminó la categoría Temporal.")).toBeInTheDocument();
    expect(fila("Temporal")).toBeUndefined();
  });

  it("si mientras tanto le crearon un producto, muestra el aviso de la API y refresca la lista", async () => {
    await abrir();
    await crear("Temporal");
    servicio.eliminarCategoria.mockRejectedValueOnce(
      new ApiError("No se puede eliminar: la categoría tiene 1 producto.", { status: 409, code: "CATEGORIA_CON_PRODUCTOS" })
    );
    const llamadas = servicio.listarCategoriasAdmin.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Temporal" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, eliminar" }));

    expect(await screen.findByText("No se puede eliminar: la categoría tiene 1 producto.")).toBeInTheDocument();
    await waitFor(() => expect(servicio.listarCategoriasAdmin.mock.calls.length).toBe(llamadas + 1));
  });
});

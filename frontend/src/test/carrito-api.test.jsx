// F3.1 · Carrito conectado a la API (CU-03 a CU-07, D1 ajustada, D4).
//   · Cliente con sesión: el carrito vive en la API (carrito.service simulado con las reglas del backend).
//   · Visitante: arma su carrito en el navegador y, al pulsar "Comprar", inicia sesión; su carrito pasa a la API.
// Los casos del instructor (carrito.test.jsx) siguen probando el carrito del visitante, que se comporta igual.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";
import { ApiError } from "../services/api";
import * as servicio from "../services/carrito.service";
import { MSG_MAX } from "../context/CarritoContext";
import { carritoSimulado, conPocoStock, conStockMinimo } from "./fixtures/catalogo";

vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());
vi.mock("../services/carrito.service", async () => (await import("./fixtures/catalogo")).carritoSimulado());

const CLIENTE = { id_usuario: 2, nombre: "Ana Cliente", email: "ana@prueba.local", rol: "cliente", estado: "activo" };
const FUNCIONES = ["obtenerCarrito", "agregarAlCarrito", "cambiarCantidadCarrito", "quitarDelCarrito"];
const [A, B] = conStockMinimo(3);
const POCO = conPocoStock();

let fetchMock;
let sim; // estado del carrito simulado de la API en cada prueba

// Usa un carrito simulado nuevo (opcionalmente con productos ya guardados en la API).
function usarCarrito(inicial = []) {
  sim = carritoSimulado({ inicial });
  FUNCIONES.forEach((nombre) => servicio[nombre].mockImplementation(sim[nombre].getMockImplementation()));
}

function conSesion() {
  localStorage.setItem("bikestore_token", "token-cliente");
  localStorage.setItem("bikestore_user", JSON.stringify(CLIENTE));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: CLIENTE }));
}

const contador = () => screen.getByRole("button", { name: /abrir carrito/i });
const abrirCarrito = () => fireEvent.click(contador());
const panel = () => within(screen.getByRole("dialog", { name: "Tu carrito" }));
const agregarDesdeTienda = (p, cantidad) => {
  fireEvent.change(screen.getByLabelText(`Cantidad a agregar de ${p.nombre}`), { target: { value: String(cantidad) } });
  fireEvent.click(screen.getByRole("button", { name: `Agregar ${p.nombre} al carrito` }));
};

async function abrirTiendaComoCliente(inicial = []) {
  usarCarrito(inicial);
  conSesion();
  renderApp("/");
  await screen.findByTestId(`producto-${A.id_producto}`);
  await waitFor(() => expect(servicio.obtenerCarrito).toHaveBeenCalled());
}

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  usarCarrito();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Cliente con sesión: el carrito vive en la API", () => {
  it("al entrar se carga el carrito guardado y el contador usa total_unidades del backend (CU-06)", async () => {
    await abrirTiendaComoCliente([[A, 2], [B, 1]]);

    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (3 unidades)"));
    abrirCarrito();
    expect(panel().getByTestId(`linea-${A.id_producto}`)).toBeInTheDocument();
    expect(panel().getByTestId("total-compra")).toHaveTextContent(/\d/);
    expect(localStorage.getItem("bikestore_carrito")).toBe("[]"); // nada en el navegador
  });

  it("agregar desde la tienda envía POST /carrito/items y muestra la respuesta", async () => {
    await abrirTiendaComoCliente();

    agregarDesdeTienda(A, 2);

    await waitFor(() => expect(servicio.agregarAlCarrito).toHaveBeenCalledWith(A.id_producto, 2));
    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (2 unidades)"));
    expect(sim.cantidades()).toEqual({ [A.id_producto]: 2 });
  });

  it("pasarse del stock al agregar corrige al máximo, avisa y solo envía lo que cabe", async () => {
    await abrirTiendaComoCliente([[POCO, 1]]);
    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (1 unidades)"));

    agregarDesdeTienda(POCO, POCO.existencias); // ya tiene 1: solo caben existencias - 1

    expect(await screen.findByText(MSG_MAX)).toBeInTheDocument();
    await waitFor(() => expect(servicio.agregarAlCarrito).toHaveBeenCalledWith(POCO.id_producto, POCO.existencias - 1));
    expect(sim.cantidades()[POCO.id_producto]).toBe(POCO.existencias);
  });

  it("cambiar la cantidad en el panel envía PUT con la cantidad fijada", async () => {
    await abrirTiendaComoCliente([[A, 1]]);
    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (1 unidades)"));
    abrirCarrito();

    fireEvent.click(panel().getByRole("button", { name: `Aumentar cantidad de ${A.nombre}` }));

    await waitFor(() => expect(servicio.cambiarCantidadCarrito).toHaveBeenCalledWith(A.id_producto, 2));
    await waitFor(() => expect(panel().getByTestId("total-unidades")).toHaveTextContent("2"));
  });

  it("− con cantidad 1 ofrece eliminar; al confirmar envía DELETE y la línea desaparece", async () => {
    await abrirTiendaComoCliente([[A, 1], [B, 1]]);
    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (2 unidades)"));
    abrirCarrito();

    fireEvent.click(panel().getByRole("button", { name: `Disminuir cantidad de ${A.nombre}` }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, eliminar" }));

    await waitFor(() => expect(servicio.quitarDelCarrito).toHaveBeenCalledWith(A.id_producto));
    expect(panel().queryByTestId(`linea-${A.id_producto}`)).not.toBeInTheDocument();
    expect(sim.cantidades()).toEqual({ [B.id_producto]: 1 });
  });

  it("si la API rechaza con STOCK_MAXIMO (el stock bajó en el servidor), avisa y vuelve a pedir el carrito", async () => {
    await abrirTiendaComoCliente([[A, 1]]);
    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (1 unidades)"));
    servicio.cambiarCantidadCarrito.mockRejectedValueOnce(
      new ApiError(MSG_MAX, { status: 400, code: "STOCK_MAXIMO", data: { maximo: 1 } })
    );
    const llamadas = servicio.obtenerCarrito.mock.calls.length;
    abrirCarrito();

    fireEvent.click(panel().getByRole("button", { name: `Aumentar cantidad de ${A.nombre}` }));

    expect(await screen.findByText(MSG_MAX)).toBeInTheDocument();
    await waitFor(() => expect(servicio.obtenerCarrito.mock.calls.length).toBe(llamadas + 1));
    await waitFor(() => expect(panel().getByTestId("total-unidades")).toHaveTextContent("1"));
  });

  it("un producto inactivado queda marcado, bloquea Comprar y solo se puede quitar (D4)", async () => {
    usarCarrito([[A, 1], [B, 2]]);
    sim.cambiarProducto(A.id_producto, { estado: "inactivo" });
    conSesion();
    renderApp("/");
    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (3 unidades)"));
    abrirCarrito();

    const linea = within(panel().getByTestId(`linea-${A.id_producto}`));
    expect(linea.getByText(/ya no está disponible/i)).toBeInTheDocument();
    expect(linea.getByLabelText(`Cantidad en el carrito de ${A.nombre}`)).toBeDisabled();
    expect(panel().getByRole("alert")).toHaveTextContent(/un producto de tu carrito no se puede comprar/i);
    expect(panel().getByRole("button", { name: "Comprar" })).toBeDisabled();

    fireEvent.click(linea.getByRole("button", { name: `Quitar ${A.nombre} del carrito` }));

    expect(await panel().findByRole("link", { name: "Comprar" })).toBeInTheDocument();
  });

  it("si el stock quedó por debajo de la cantidad (SUPERA_STOCK), al bajarla se puede comprar", async () => {
    usarCarrito([[A, 3]]);
    sim.cambiarProducto(A.id_producto, { existencias: 2 });
    conSesion();
    renderApp("/");
    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (3 unidades)"));
    abrirCarrito();

    expect(panel().getByText(/solo quedan 2 unidades/i)).toBeInTheDocument();
    expect(panel().getByRole("button", { name: "Comprar" })).toBeDisabled();

    fireEvent.change(panel().getByLabelText(`Cantidad en el carrito de ${A.nombre}`), { target: { value: "2" } });

    await waitFor(() => expect(servicio.cambiarCantidadCarrito).toHaveBeenCalledWith(A.id_producto, 2));
    expect(await panel().findByRole("link", { name: "Comprar" })).toBeInTheDocument();
  });

  it("Comprar lleva a /checkout con el resumen del carrito", async () => {
    await abrirTiendaComoCliente([[A, 2]]);
    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (2 unidades)"));
    abrirCarrito();

    fireEvent.click(panel().getByRole("link", { name: "Comprar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Finalizar compra" })).toBeInTheDocument();
    expect(screen.getByText(A.nombre)).toBeInTheDocument();
    expect(screen.getByText("Resumen", { selector: "li" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Continuar con el envío" })).toBeEnabled();
  });

  it("al cerrar sesión el contador vuelve al carrito del navegador (vacío)", async () => {
    await abrirTiendaComoCliente([[A, 2]]);
    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (2 unidades)"));

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() => expect(contador()).toHaveAccessibleName("Abrir carrito (0 unidades)"));
  });
});

describe("Visitante: carrito en el navegador y login al comprar", () => {
  async function iniciarSesionEnFormulario() {
    fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: { user: CLIENTE, token: "token-cliente" } }));
    fireEvent.change(screen.getByPlaceholderText("Correo"), { target: { value: CLIENTE.email } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "Clave1234" } });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));
  }

  it("sin sesión agrega al carrito del navegador, sin llamar a la API", async () => {
    renderApp("/");
    await screen.findByTestId(`producto-${A.id_producto}`);

    agregarDesdeTienda(A, 2);

    expect(contador()).toHaveAccessibleName("Abrir carrito (2 unidades)");
    expect(servicio.agregarAlCarrito).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("bikestore_carrito"))).toEqual([expect.objectContaining({ id: A.id_producto, cantidad: 2 })]);
  });

  it("Comprar pide iniciar sesión; al entrar, el carrito pasa a la API, se vacía el navegador y llega al checkout", async () => {
    renderApp("/");
    await screen.findByTestId(`producto-${A.id_producto}`);
    agregarDesdeTienda(A, 2);
    agregarDesdeTienda(B, 1);
    abrirCarrito();
    expect(panel().getByText(/te pediremos iniciar sesión/i)).toBeInTheDocument();

    fireEvent.click(panel().getByRole("link", { name: "Comprar" }));
    expect(await screen.findByRole("heading", { name: /inicia sesión para continuar/i })).toBeInTheDocument();
    await iniciarSesionEnFormulario();

    expect(await screen.findByRole("heading", { level: 1, name: "Finalizar compra" })).toBeInTheDocument();
    await waitFor(() => expect(sim.cantidades()).toEqual({ [A.id_producto]: 2, [B.id_producto]: 1 }));
    expect(servicio.agregarAlCarrito).toHaveBeenCalledTimes(2); // una vez cada producto, aunque el efecto corra dos veces
    expect(JSON.parse(localStorage.getItem("bikestore_carrito"))).toEqual([]);
    expect(await screen.findByText(/pasamos a tu cuenta los productos/i)).toBeInTheDocument();
    expect(await screen.findByText(A.nombre)).toBeInTheDocument();
  });

  it("si en su cuenta ya tenía unidades y no caben todas, agrega las que quedan libres y lo avisa (R2)", async () => {
    usarCarrito([[POCO, POCO.existencias - 1]]); // en la API solo queda 1 unidad libre de POCO
    renderApp("/");
    await screen.findByTestId(`producto-${POCO.id_producto}`);
    agregarDesdeTienda(POCO, 2);
    fireEvent.click(contador());
    fireEvent.click(panel().getByRole("link", { name: "Comprar" }));
    await screen.findByRole("heading", { name: /inicia sesión para continuar/i });

    await iniciarSesionEnFormulario();

    await waitFor(() => expect(sim.cantidades()[POCO.id_producto]).toBe(POCO.existencias));
    expect(servicio.agregarAlCarrito).toHaveBeenLastCalledWith(POCO.id_producto, 1);
    expect(await screen.findByText(new RegExp(`no cabían todas las unidades de: ${POCO.nombre}`))).toBeInTheDocument();
  });

  it("sin conexión al pasar el carrito, los productos se conservan en el navegador para el siguiente intento", async () => {
    servicio.agregarAlCarrito.mockRejectedValueOnce(new ApiError("No se pudo conectar con el servidor."));
    localStorage.setItem(
      "bikestore_carrito",
      JSON.stringify([{ id: A.id_producto, nombre: A.nombre, precio: A.precio, stock: A.existencias, cantidad: 2 }])
    );
    conSesion();
    renderApp("/");

    expect(await screen.findByText("No se pudo conectar con el servidor.")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("bikestore_carrito"))).toEqual([expect.objectContaining({ id: A.id_producto, cantidad: 2 })]);
  });
});

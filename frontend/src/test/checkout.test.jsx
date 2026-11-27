// F3.3 · Checkout y pago simulado (CU-07, CU-08; R5; decisiones D, E y F).
// El carrito y los pedidos se simulan juntos (fixtures/catalogo.js): confirmar vacía el carrito simulado y crea
// el pedido; pagar aplica las mismas reglas que la API (0000 rechaza, SIN_STOCK, PEDIDO_YA_PAGADO).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";
import { ApiError } from "../services/api";
import * as carrito from "../services/carrito.service";
import * as pedidos from "../services/pedidos.service";
import { formatoCOP as formatoReal } from "../utils/formato";
import { carritoSimulado, conStockMinimo, pedidoEn, pedidosSimulado } from "./fixtures/catalogo";

vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());
vi.mock("../services/carrito.service", async () => (await import("./fixtures/catalogo")).carritoSimulado());
vi.mock("../services/pedidos.service", async () => (await import("./fixtures/catalogo")).pedidosSimulado());

const CLIENTE = { id_usuario: 2, nombre: "Ana Cliente", email: "ana@prueba.local", rol: "cliente", estado: "activo" };
const [A, B] = conStockMinimo(3);
const TARJETA = "4111 1111 1111 1111";
const RECHAZO = "4111 1111 1111 0000";
const formatoCOP = (v) => formatoReal(v).replace(/\s/g, " ");

let fetchMock;
let simCarrito;
let simPedidos;

function usar(inicial = [[A, 2], [B, 1]]) {
  simCarrito = carritoSimulado({ inicial });
  simPedidos = pedidosSimulado({ carrito: simCarrito });
  ["obtenerCarrito", "agregarAlCarrito", "cambiarCantidadCarrito", "quitarDelCarrito"].forEach((f) =>
    carrito[f].mockImplementation(simCarrito[f].getMockImplementation())
  );
  ["listarPedidos", "obtenerPedido", "confirmarCarrito", "pagarPedido"].forEach((f) =>
    pedidos[f].mockImplementation(simPedidos[f].getMockImplementation())
  );
}

async function abrir(ruta = "/checkout") {
  localStorage.setItem("bikestore_token", "token-cliente");
  localStorage.setItem("bikestore_user", JSON.stringify(CLIENTE));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: CLIENTE }));
  renderApp(ruta);
}

const escribir = (etiqueta, valor) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
const pasoActual = () => screen.getByRole("list", { name: "Pasos de la compra" }).querySelector('[aria-current="step"]');

async function llegarAlEnvio() {
  await abrir();
  fireEvent.click(await screen.findByRole("button", { name: "Continuar con el envío" }));
  return screen.findByRole("form", { name: "Datos de envío" });
}

function llenarEnvio() {
  escribir("Teléfono", " 300 123 4567 ");
  escribir("Departamento", "Valle del Cauca");
  escribir("Ciudad o municipio", "Palmira");
  escribir("Dirección", "Calle 30 # 28-15");
}

async function llegarAlPago() {
  await llegarAlEnvio();
  llenarEnvio();
  fireEvent.click(screen.getByRole("button", { name: "Continuar al pago" }));
  return screen.findByRole("form", { name: "Pagar el pedido" });
}

function pagarCon(numero, medio = "Tarjeta de crédito") {
  fireEvent.click(screen.getByLabelText(medio));
  escribir(medio === "Cuenta bancaria" ? "Número de la cuenta" : "Número de la tarjeta", numero);
  fireEvent.click(screen.getByRole("button", { name: /^Pagar/ }));
}

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  usar();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Paso 1 · Resumen (CU-07)", () => {
  it("muestra el carrito con su total y el paso actual", async () => {
    await abrir();

    expect(await screen.findByText(A.nombre)).toBeInTheDocument();
    expect(screen.getByText(B.nombre)).toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(formatoCOP(A.precio * 2 + B.precio));
    expect(pasoActual()).toHaveTextContent("Resumen");
  });

  it("si algún producto no se puede comprar, no deja continuar", async () => {
    simCarrito.cambiarProducto(A.id_producto, { estado: "inactivo" });
    await abrir();

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pueden comprar/i);
    expect(screen.getByRole("button", { name: "Continuar con el envío" })).toBeDisabled();
  });
});

describe("Paso 2 · Envío", () => {
  it("prellena el nombre del usuario y valida los campos antes de llamar a la API", async () => {
    await llegarAlEnvio();
    expect(pasoActual()).toHaveTextContent("Envío");
    expect(screen.getByLabelText("Nombre de quien recibe")).toHaveValue(CLIENTE.nombre);

    escribir("Teléfono", "12345");
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago" }));

    expect(screen.getByText(/al menos 7 dígitos/i)).toBeInTheDocument();
    expect(screen.getByText("Elige el departamento")).toBeInTheDocument();
    expect(screen.getByText("Escribe la ciudad o el municipio")).toBeInTheDocument();
    expect(screen.getByText("Escribe la dirección de entrega")).toBeInTheDocument();
    expect(pedidos.confirmarCarrito).not.toHaveBeenCalled();
  });

  it("el departamento se elige de la lista de Colombia", async () => {
    await llegarAlEnvio();

    const opciones = within(screen.getByLabelText("Departamento")).getAllByRole("option").map((o) => o.textContent);
    expect(opciones).toContain("Bogotá D. C.");
    expect(opciones).toContain("Valle del Cauca");
    expect(opciones).toHaveLength(34); // la opción vacía + 32 departamentos + Bogotá D. C.
  });

  it("confirma el carrito con los datos limpios, lo deja vacío y pasa al pago con el número del pedido", async () => {
    await llegarAlPago();

    expect(pedidos.confirmarCarrito).toHaveBeenCalledWith({
      envio_nombre: CLIENTE.nombre,
      envio_telefono: "300 123 4567",
      envio_departamento: "Valle del Cauca",
      envio_ciudad: "Palmira",
      envio_direccion: "Calle 30 # 28-15",
    });
    expect(pasoActual()).toHaveTextContent("Pago");
    expect(screen.getByRole("heading", { name: "Pedido BS-2026-000100" })).toBeInTheDocument();
    expect(simCarrito.cantidades()).toEqual({}); // el carrito ya es el pedido (D12)
    await waitFor(() => expect(carrito.obtenerCarrito.mock.calls.length).toBeGreaterThan(1)); // se refrescó
  });

  it("si el carrito cambió (CARRITO_NO_DISPONIBLE), vuelve al resumen y dice qué producto falló", async () => {
    await llegarAlEnvio();
    llenarEnvio();
    pedidos.confirmarCarrito.mockRejectedValueOnce(
      new ApiError("Hay productos no disponibles en el carrito", {
        status: 409,
        code: "CARRITO_NO_DISPONIBLE",
        data: { items: [{ id_producto: A.id_producto, nombre: A.nombre, motivo: "SIN_STOCK" }] },
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Hay productos no disponibles en el carrito");
    expect(alerta).toHaveTextContent(`${A.nombre}: está agotado`);
    expect(pasoActual()).toHaveTextContent("Resumen");
  });
});

describe("Paso 3 · Pago (CU-08)", () => {
  it("aprobado: envía solo dígitos, muestra el número enmascarado y termina en el detalle con la confirmación", async () => {
    await llegarAlPago();
    escribir("Número de la tarjeta", TARJETA);
    expect(screen.getByRole("button", { name: /^Pagar/ })).toHaveTextContent("•••• 1111");

    fireEvent.click(screen.getByRole("button", { name: /^Pagar/ }));

    expect(await screen.findByRole("heading", { level: 1, name: "Pedido BS-2026-000100" })).toBeInTheDocument();
    expect(pedidos.pagarPedido).toHaveBeenCalledWith(100, { medio_pago: "tarjeta_credito", numero: "4111111111111111" });
    expect(screen.getByText(/gracias por tu compra/i)).toBeInTheDocument();
    expect(screen.getByText("Pagado", { selector: ".pedido__estado" })).toBeInTheDocument();
  });

  it("rechazado (0000): lo explica, borra el número y permite reintentar sobre el mismo pedido (decisiones D y F)", async () => {
    await llegarAlPago();

    pagarCon(RECHAZO, "Tarjeta de débito");

    expect(await screen.findByText(/el pago fue rechazado\./i)).toBeInTheDocument();
    expect(screen.getByLabelText("Número de la tarjeta")).toHaveValue("");

    pagarCon("123456789", "Cuenta bancaria");

    expect(await screen.findByRole("heading", { level: 1, name: "Pedido BS-2026-000100" })).toBeInTheDocument();
    expect(pedidos.pagarPedido.mock.calls.map(([id]) => id)).toEqual([100, 100]);
    const pagos = within(screen.getByRole("list", { name: "Pagos del pedido" })).getAllByRole("listitem");
    expect(pagos.map((p) => within(p).getByText(/Aprobado|Rechazado/).textContent)).toEqual(["Rechazado", "Aprobado"]);
  });

  it("SIN_STOCK: no se cobró nada, dice qué falta y el pedido sigue pendiente (decisión E)", async () => {
    await llegarAlPago();
    simPedidos.sinStock(A.id_producto, 1);

    pagarCon(TARJETA);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("No se cobró nada.");
    expect(alerta).toHaveTextContent(`${A.nombre}: quedan 1 unidad`);
    expect(alerta).toHaveTextContent(/sigue pendiente/i);
    expect(screen.getByRole("form", { name: "Pagar el pedido" })).toBeInTheDocument();
  });

  it.each([
    ["Tarjeta de crédito", "4111 1111 1111", /entre 13 y 19 dígitos/],
    ["Cuenta bancaria", "12345", /entre 6 y 20 dígitos/],
  ])("valida la longitud del número (%s) sin llamar a la API", async (medio, numero, error) => {
    await llegarAlPago();

    pagarCon(numero, medio);

    expect(screen.getByText(error)).toBeInTheDocument();
    expect(pedidos.pagarPedido).not.toHaveBeenCalled();
  });

  it("el número nunca queda en localStorage ni en la consola (R5)", async () => {
    const espias = ["log", "info", "warn", "error", "debug"].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    await llegarAlPago();

    pagarCon(RECHAZO);
    await screen.findByText(/el pago fue rechazado\./i);

    const guardado = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
    expect(guardado).not.toMatch(/4111\s?1111/);
    for (const espia of espias) {
      expect(JSON.stringify(espia.mock.calls)).not.toMatch(/4111\s?1111/);
    }
  });
});

describe("Pagar un pedido existente · /cuenta/pedidos/:numero/pagar", () => {
  it("desde el detalle de un pedido rechazado, 'Pagar' lleva al pago y al aprobarse vuelve con la confirmación", async () => {
    const fallido = pedidoEn("fallido");
    await abrir(`/cuenta/pedidos/${fallido.numero_pedido}`);

    fireEvent.click(await screen.findByRole("link", { name: /^Pagar/ }));
    expect(await screen.findByRole("heading", { level: 1, name: `Pagar pedido ${fallido.numero_pedido}` })).toBeInTheDocument();
    pagarCon(TARJETA);

    expect(await screen.findByText(/gracias por tu compra/i)).toBeInTheDocument();
    expect(pedidos.pagarPedido).toHaveBeenCalledWith(fallido.id_pedido, { medio_pago: "tarjeta_credito", numero: "4111111111111111" });
  });

  it("un pedido ya pagado no se puede volver a pagar", async () => {
    await abrir(`/cuenta/pedidos/${pedidoEn("pagado").numero_pedido}/pagar`);

    expect(await screen.findByText("Este pedido ya está pagado.")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Pagar el pedido" })).not.toBeInTheDocument();
  });

  it("si otra pestaña ya lo pagó (PEDIDO_YA_PAGADO), lleva al detalle", async () => {
    const pendiente = pedidoEn("pendiente");
    pedidos.pagarPedido.mockRejectedValueOnce(new ApiError("El pedido ya fue pagado", { status: 409, code: "PEDIDO_YA_PAGADO" }));
    await abrir(`/cuenta/pedidos/${pendiente.numero_pedido}/pagar`);
    await screen.findByRole("form", { name: "Pagar el pedido" });

    pagarCon(TARJETA);

    expect(await screen.findByRole("heading", { level: 1, name: `Pedido ${pendiente.numero_pedido}` })).toBeInTheDocument();
  });

  it("un pedido que no existe muestra 'Pedido no encontrado'", async () => {
    await abrir("/cuenta/pedidos/BS-2000-999999/pagar");

    expect(await screen.findByRole("heading", { level: 1, name: "Pedido no encontrado" })).toBeInTheDocument();
  });
});

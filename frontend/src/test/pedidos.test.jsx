// F3.2 · Mis pedidos y detalle del pedido (CU-08). El servicio se simula con pedidos de prueba hechos con
// los productos de la semilla (fixtures/catalogo.js): uno pendiente, uno con el pago rechazado y dos pagados
// (uno de ellos con un rechazo y un reintento, decisión F).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";
import { ApiError } from "../services/api";
import { listarPedidos, obtenerPedido } from "../services/pedidos.service";
import { formatoCOP as formatoReal } from "../utils/formato";
import { PEDIDOS, pedidoEn, pedidosSimulado } from "./fixtures/catalogo";

vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());
vi.mock("../services/carrito.service", async () => (await import("./fixtures/catalogo")).carritoSimulado());
vi.mock("../services/pedidos.service", async () => (await import("./fixtures/catalogo")).pedidosSimulado());

const CLIENTE = { id_usuario: 2, nombre: "Ana Cliente", email: "ana@prueba.local", rol: "cliente", estado: "activo" };
const ADMIN = { id_usuario: 1, nombre: "Admin Tienda", email: "admin@prueba.local", rol: "admin", estado: "activo" };
const formatoCOP = (v) => formatoReal(v).replace(/\s/g, " "); // jest-dom normaliza el espacio de no separación

let fetchMock;

function conSesion(usuario = CLIENTE) {
  localStorage.setItem("bikestore_token", `token-${usuario.rol}`);
  localStorage.setItem("bikestore_user", JSON.stringify(usuario));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: usuario }));
}

async function abrir(ruta) {
  conSesion();
  renderApp(ruta);
}

const items = () => within(screen.getByRole("list", { name: "Pedidos" })).getAllByRole("listitem");

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  const base = pedidosSimulado();
  listarPedidos.mockImplementation(base.listarPedidos.getMockImplementation());
  obtenerPedido.mockImplementation(base.obtenerPedido.getMockImplementation());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Acceso", () => {
  it("desde Mi cuenta, la tarjeta 'Mis pedidos' lleva al listado", async () => {
    await abrir("/cuenta");

    fireEvent.click(await screen.findByRole("link", { name: "Mis pedidos" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Mis pedidos" })).toBeInTheDocument();
  });

  it("sin sesión lleva al login", async () => {
    renderApp("/cuenta/pedidos");
    expect(screen.getByRole("heading", { name: /inicia sesión para continuar/i })).toBeInTheDocument();
    expect(listarPedidos).not.toHaveBeenCalled();
  });

  it("un admin no entra a /cuenta/pedidos", async () => {
    conSesion(ADMIN);
    renderApp("/cuenta/pedidos");

    expect(await screen.findByRole("heading", { name: "Panel de administración" })).toBeInTheDocument();
    expect(listarPedidos).not.toHaveBeenCalled();
  });
});

describe("Listado · /cuenta/pedidos", () => {
  it("muestra los pedidos del más reciente al más antiguo con número, estado y total", async () => {
    await abrir("/cuenta/pedidos");
    await screen.findByRole("list", { name: "Pedidos" });

    expect(items()).toHaveLength(PEDIDOS.length);
    items().forEach((item, i) => {
      const p = PEDIDOS[i];
      expect(within(item).getByText(p.numero_pedido)).toBeInTheDocument();
      expect(within(item).getByText(formatoCOP(p.total))).toBeInTheDocument();
    });
    expect(within(items()[0]).getByText("Pendiente de pago")).toBeInTheDocument();
    expect(within(items()[1]).getByText("Pago rechazado")).toBeInTheDocument();
    expect(within(items()[2]).getByText("Pagado")).toBeInTheDocument();
  });

  it("la fecha se muestra en formato legible (no el texto ISO de la API)", async () => {
    await abrir("/cuenta/pedidos");
    await screen.findByRole("list", { name: "Pedidos" });

    const fecha = items()[0].querySelector(".pedidos__fecha").textContent;
    expect(fecha).toMatch(/2026/);
    expect(fecha).not.toMatch(/T\d\d:\d\d|Z$/);
  });

  it("'Ver detalle' abre el pedido", async () => {
    await abrir("/cuenta/pedidos");
    const [primero] = PEDIDOS;

    fireEvent.click(await screen.findByRole("link", { name: `Ver detalle del pedido ${primero.numero_pedido}` }));

    expect(await screen.findByRole("heading", { level: 1, name: `Pedido ${primero.numero_pedido}` })).toBeInTheDocument();
    expect(obtenerPedido).toHaveBeenCalledWith(primero.numero_pedido);
  });

  it("sin pedidos lo dice y ofrece ir a la tienda", async () => {
    listarPedidos.mockResolvedValueOnce({ ok: true, data: [] });
    await abrir("/cuenta/pedidos");

    expect(await screen.findByText("Aún no tienes pedidos.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a la tienda" })).toHaveAttribute("href", "/");
  });

  it("si la carga falla, permite reintentar", async () => {
    listarPedidos.mockRejectedValueOnce(new ApiError("No se pudo conectar con el servidor."));
    await abrir("/cuenta/pedidos");

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("list", { name: "Pedidos" })).toBeInTheDocument();
  });
});

describe("Detalle · /cuenta/pedidos/:numero", () => {
  it("muestra productos con cantidad, precio unitario y subtotal, el total y la dirección de envío", async () => {
    const p = pedidoEn("pagado", { reintentado: true });
    await abrir(`/cuenta/pedidos/${p.numero_pedido}`);
    await screen.findByRole("heading", { level: 1, name: `Pedido ${p.numero_pedido}` });

    const tabla = within(screen.getByRole("table"));
    for (const item of p.items) {
      const [, cantidad, precio, subtotal] = within(tabla.getByText(item.nombre).closest("tr")).getAllByRole("cell");
      expect(cantidad).toHaveTextContent(String(item.cantidad));
      expect(precio).toHaveTextContent(formatoCOP(item.precio_unitario));
      expect(subtotal).toHaveTextContent(formatoCOP(item.subtotal));
    }
    expect(screen.getByTestId("pedido-total")).toHaveTextContent(formatoCOP(p.total));
    const envio = within(screen.getByRole("region", { name: "Envío" }));
    expect(envio.getByText(p.envio_nombre)).toBeInTheDocument();
    expect(envio.getByText(p.envio_direccion)).toBeInTheDocument();
    expect(envio.getByText(`${p.envio_ciudad}, ${p.envio_departamento}`)).toBeInTheDocument();
  });

  it("un pedido pagado tras un rechazo muestra los dos intentos, con medio y solo los últimos 4 dígitos (decisión F)", async () => {
    const p = pedidoEn("pagado", { reintentado: true });
    await abrir(`/cuenta/pedidos/${p.numero_pedido}`);

    const pagos = within(await screen.findByRole("list", { name: "Pagos del pedido" })).getAllByRole("listitem");
    expect(pagos).toHaveLength(2);
    expect(within(pagos[0]).getByText("Tarjeta de crédito")).toBeInTheDocument();
    expect(within(pagos[0]).getByText("•••• 0000")).toBeInTheDocument();
    expect(within(pagos[0]).getByText("Rechazado")).toBeInTheDocument();
    expect(within(pagos[1]).getByText("Cuenta bancaria")).toBeInTheDocument();
    expect(within(pagos[1]).getByText("Aprobado")).toBeInTheDocument();
    expect(screen.getByText("Pagado", { selector: ".pedido__estado" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pagar/i })).not.toBeInTheDocument();
  });

  it.each([
    ["pendiente", "Falta el pago"],
    ["fallido", "El pago fue rechazado"],
  ])("un pedido %s ofrece 'Pagar', que lleva al paso de pago de ese pedido (F3.3)", async (estado, titulo) => {
    const p = pedidoEn(estado);
    await abrir(`/cuenta/pedidos/${p.numero_pedido}`);

    expect(await screen.findByRole("heading", { name: titulo })).toBeInTheDocument();
    const enlace = screen.getByRole("link", { name: /^Pagar/ });
    expect(enlace).toHaveTextContent(formatoCOP(p.total));
    expect(enlace).toHaveAttribute("href", `/cuenta/pedidos/${p.numero_pedido}/pagar`);
  });

  it("un pedido pendiente sin pagos lo dice", async () => {
    await abrir(`/cuenta/pedidos/${pedidoEn("pendiente").numero_pedido}`);

    expect(await screen.findByText("Todavía no hay pagos.")).toBeInTheDocument();
  });

  it("un pedido que no existe (o de otro cliente) muestra 'Pedido no encontrado'", async () => {
    await abrir("/cuenta/pedidos/BS-2000-999999");

    expect(await screen.findByRole("heading", { level: 1, name: "Pedido no encontrado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a mis pedidos" })).toHaveAttribute("href", "/cuenta/pedidos");
  });

  it("si la API no responde, permite reintentar", async () => {
    const p = pedidoEn("pendiente");
    obtenerPedido.mockRejectedValueOnce(new ApiError("No se pudo conectar con el servidor."));
    await abrir(`/cuenta/pedidos/${p.numero_pedido}`);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { level: 1, name: `Pedido ${p.numero_pedido}` })).toBeInTheDocument();
  });

  it("'Volver a mis pedidos' regresa al listado", async () => {
    await abrir(`/cuenta/pedidos/${pedidoEn("pendiente").numero_pedido}`);

    fireEvent.click(await screen.findByRole("link", { name: "Volver a mis pedidos" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Mis pedidos" })).toBeInTheDocument();
  });
});

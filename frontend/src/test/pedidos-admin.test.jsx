// F4 · Pedidos del panel del admin (decisión N): listado con GET /pedidos/admin y detalle de solo lectura.
// Los servicios se simulan con fixtures/tablero.js (pedidos de fixtures/catalogo.js con nombre y correo del cliente).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";
import { ApiError } from "../services/api";
import { listarPedidosAdmin, obtenerPedido } from "../services/pedidos.service";
import { formatoCOP as formatoReal } from "../utils/formato";
import { PEDIDOS_ADMIN, errorApi, pedidosAdminSimulado } from "./fixtures/tablero";
import { pedidoEn } from "./fixtures/catalogo";

vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());
vi.mock("../services/carrito.service", async () => (await import("./fixtures/catalogo")).carritoSimulado());
vi.mock("../services/pedidos.service", async () => (await import("./fixtures/tablero")).pedidosAdminSimulado());

const ADMIN = { id_usuario: 1, nombre: "Admin Tienda", email: "admin@prueba.local", rol: "admin", estado: "activo" };
const formatoCOP = (v) => formatoReal(v).replace(/\s/g, " ");

let fetchMock;

async function abrir(ruta = "/admin/pedidos") {
  localStorage.setItem("bikestore_token", "token-admin");
  localStorage.setItem("bikestore_user", JSON.stringify(ADMIN));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: ADMIN }));
  renderApp(ruta);
}

const filas = () => within(screen.getByRole("table", { name: "Listado de pedidos" })).getAllByRole("row").slice(1);
const numeros = () => filas().map((f) => within(f).getAllByRole("cell")[0].textContent);
const ultimaLlamada = () => listarPedidosAdmin.mock.calls.at(-1)[0];

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  const base = pedidosAdminSimulado();
  listarPedidosAdmin.mockImplementation(base.listarPedidosAdmin.getMockImplementation());
  obtenerPedido.mockImplementation(base.obtenerPedido.getMockImplementation());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Acceso", () => {
  it("la barra lateral y el inicio del panel enlazan a Pedidos y Tablero", async () => {
    await abrir("/admin");

    const inicio = within(await screen.findByRole("main"));
    expect(inicio.getByRole("link", { name: "Pedidos" })).toHaveAttribute("href", "/admin/pedidos");
    expect(inicio.getByRole("link", { name: "Tablero" })).toHaveAttribute("href", "/admin/dashboard");
    expect(inicio.queryByText(/próximamente/i)).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("navigation", { name: "Administración" })).getByRole("link", { name: "Pedidos" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Pedidos" })).toBeInTheDocument();
  });
});

describe("Listado", () => {
  it("muestra los pedidos de todos los clientes con cliente, estado, unidades y total", async () => {
    await abrir();
    await screen.findByRole("table", { name: "Listado de pedidos" });

    expect(numeros()).toEqual(PEDIDOS_ADMIN.map((p) => p.numero_pedido));
    expect(screen.getByText(`${PEDIDOS_ADMIN.length} pedidos`)).toBeInTheDocument();
    const [primero] = PEDIDOS_ADMIN;
    const celdas = within(filas()[0]).getAllByRole("cell").map((c) => c.textContent.replace(/\s/g, " "));
    expect(celdas[1]).toBe(`${primero.cliente_nombre}${primero.cliente_email}`);
    expect(celdas[3]).toBe("Pendiente de pago");
    expect(celdas[4]).toBe(String(primero.unidades));
    expect(celdas[5]).toBe(formatoCOP(primero.total));
    expect(listarPedidosAdmin).toHaveBeenCalledWith({ q: "", estado: "", desde: "", hasta: "" });
  });

  it("el filtro de estado pide la lista filtrada y lo guarda en la URL", async () => {
    await abrir();
    await screen.findByRole("table", { name: "Listado de pedidos" });

    fireEvent.click(screen.getByRole("button", { name: "Pagados" }));

    await waitFor(() => expect(ultimaLlamada()).toMatchObject({ estado: "pagado" }));
    await waitFor(() => expect(numeros()).toEqual(PEDIDOS_ADMIN.filter((p) => p.estado === "pagado").map((p) => p.numero_pedido)));
    expect(screen.getByRole("button", { name: "Pagados" })).toHaveAttribute("aria-pressed", "true");
  });

  it("al llegar desde el tablero con ?estado=pendiente, la lista ya viene filtrada", async () => {
    await abrir("/admin/pedidos?estado=pendiente");

    await screen.findByRole("table", { name: "Listado de pedidos" });
    expect(listarPedidosAdmin).toHaveBeenCalledWith({ q: "", estado: "pendiente", desde: "", hasta: "" });
    expect(screen.getByRole("button", { name: "Pendientes" })).toHaveAttribute("aria-pressed", "true");
  });

  it("la búsqueda espera a que se deje de escribir y busca por cliente", async () => {
    await abrir();
    await screen.findByRole("table", { name: "Listado de pedidos" });

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar por número, cliente o correo" }), { target: { value: "luis" } });
    expect(listarPedidosAdmin).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(ultimaLlamada()).toMatchObject({ q: "luis" }));
    await waitFor(() => expect(numeros()).toEqual(PEDIDOS_ADMIN.filter((p) => p.cliente_nombre === "Luis Pérez").map((p) => p.numero_pedido)));
  });

  it("filtra por fechas y avisa, sin pedir nada, si 'desde' es posterior a 'hasta'", async () => {
    await abrir();
    await screen.findByRole("table", { name: "Listado de pedidos" });

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-21" } });
    await waitFor(() => expect(ultimaLlamada()).toMatchObject({ desde: "2026-11-21" }));
    const llamadas = listarPedidosAdmin.mock.calls.length;

    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-20" } });

    expect(await screen.findByRole("alert")).toHaveTextContent('La fecha "desde" no puede ser posterior a "hasta".');
    expect(screen.getByLabelText("Hasta")).toHaveAttribute("aria-invalid", "true");
    expect(listarPedidosAdmin).toHaveBeenCalledTimes(llamadas);
  });

  it("sin resultados con filtros ofrece quitarlos; sin pedidos lo dice", async () => {
    await abrir("/admin/pedidos?q=nadie");
    expect(await screen.findByText("Ningún pedido coincide con los filtros.")).toBeInTheDocument();

    listarPedidosAdmin.mockResolvedValue({ ok: true, data: [] });
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));

    await waitFor(() => expect(ultimaLlamada()).toEqual({ q: "", estado: "", desde: "", hasta: "" }));
    expect(await screen.findByText("Todavía no hay pedidos.")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar por número, cliente o correo" })).toHaveValue("");
  });

  it("con 200 pedidos (el máximo de la API) avisa que hay que filtrar para ver otros", async () => {
    const muchos = Array.from({ length: 200 }, (_, i) => ({ ...PEDIDOS_ADMIN[0], id_pedido: i + 1, numero_pedido: `BS-2026-${String(i + 1).padStart(6, "0")}` }));
    listarPedidosAdmin.mockResolvedValue({ ok: true, data: muchos });
    await abrir();

    expect(await screen.findByText(/200 pedidos · se muestran los 200 más recientes/)).toBeInTheDocument();
  });

  it("si la API falla, muestra el error y 'Reintentar' vuelve a pedir", async () => {
    listarPedidosAdmin.mockRejectedValueOnce(new ApiError("No se pudo conectar con el servidor."));
    await abrir();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("table", { name: "Listado de pedidos" })).toBeInTheDocument();
  });
});

describe("Detalle", () => {
  it("se abre desde el listado, es de solo lectura y 'Volver' conserva los filtros", async () => {
    const pagado = pedidoEn("pagado", { reintentado: true });
    await abrir("/admin/pedidos?estado=pagado");
    await screen.findByRole("table", { name: "Listado de pedidos" });

    fireEvent.click(screen.getByRole("link", { name: pagado.numero_pedido }));

    expect(await screen.findByRole("heading", { level: 1, name: `Pedido ${pagado.numero_pedido}` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Productos" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Pagos del pedido" })).getAllByRole("listitem")).toHaveLength(pagado.pagos.length);
    expect(screen.queryByRole("link", { name: /pagar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a pedidos" })).toHaveAttribute("href", "/admin/pedidos?estado=pagado");
  });

  it("un pedido pendiente tampoco ofrece pagar al admin", async () => {
    const pendiente = pedidoEn("pendiente");
    await abrir(`/admin/pedidos/${pendiente.numero_pedido}`);

    expect(await screen.findByText("Pendiente de pago")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pagar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a pedidos" })).toHaveAttribute("href", "/admin/pedidos");
  });

  it("un número que no existe muestra 'Pedido no encontrado'", async () => {
    await abrir("/admin/pedidos/BS-2099-999999");

    expect(await screen.findByRole("heading", { name: "Pedido no encontrado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a pedidos" })).toHaveAttribute("href", "/admin/pedidos");
  });

  it("si falla la carga, 'Reintentar' vuelve a pedir el pedido", async () => {
    const pendiente = pedidoEn("pendiente");
    obtenerPedido.mockRejectedValueOnce(errorApi("No se pudo conectar con el servidor.", 0));
    await abrir(`/admin/pedidos/${pendiente.numero_pedido}`);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { level: 1, name: `Pedido ${pendiente.numero_pedido}` })).toBeInTheDocument();
  });
});

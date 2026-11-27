// F4.1 · Tablero del admin (CU-16, CU-17) y F4.2 · Exportar informes (CU-18).
// Los servicios se simulan con fixtures/tablero.js. recharts necesita medidas que jsdom no tiene:
// ResponsiveContainer se reemplaza por un contenedor de tamaño fijo para que la gráfica se dibuje.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cloneElement } from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";
import { ApiError } from "../services/api";
import { descargarInforme, obtenerAlertas, obtenerMetricas } from "../services/dashboard.service";
import { formatoCOP as formatoReal } from "../utils/formato";
import { formatoDia } from "../utils/fechas";
import { ALERTAS, ALERTAS_VACIAS, CATEGORIAS, errorApi, metricasDe, tableroSimulado } from "./fixtures/tablero";
import { PEDIDOS } from "./fixtures/catalogo";

vi.mock("recharts", async (original) => ({
  ...(await original()),
  ResponsiveContainer: ({ children, height }) => <div style={{ width: 600, height }}>{cloneElement(children, { width: 600, height })}</div>,
}));
vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());
vi.mock("../services/carrito.service", async () => (await import("./fixtures/catalogo")).carritoSimulado());
vi.mock("../services/dashboard.service", async () => (await import("./fixtures/tablero")).tableroSimulado());

const ADMIN = { id_usuario: 1, nombre: "Admin Tienda", email: "admin@prueba.local", rol: "admin", estado: "activo" };
const CLIENTE = { id_usuario: 2, nombre: "Ana Cliente", email: "ana@prueba.local", rol: "cliente", estado: "activo" };
const formatoCOP = (v) => formatoReal(v).replace(/\s/g, " "); // jest-dom normaliza el espacio de no separación

let fetchMock;

async function abrir(ruta = "/admin/dashboard", usuario = ADMIN) {
  localStorage.setItem("bikestore_token", `token-${usuario.rol}`);
  localStorage.setItem("bikestore_user", JSON.stringify(usuario));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: usuario }));
  renderApp(ruta);
  if (usuario.rol === "admin") await screen.findByText("Ventas totales");
}

const texto = (el) => el.textContent.replace(/\s/g, " ");
const resumen = () => Object.fromEntries(
  within(screen.getByRole("region", { name: "Ventas" })).getAllByRole("term").map((dt) => [dt.textContent, texto(dt.nextElementSibling)])
);
const filasVendidos = () =>
  within(screen.getByRole("table", { name: /más vendidos/i })).getAllByRole("row").slice(1).map((f) => within(f).getAllByRole("cell").map(texto));
const tarjetaAlerta = (titulo) => screen.getByRole("region", { name: titulo });
const ultimaLlamada = () => obtenerMetricas.mock.calls.at(-1)[0];

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  const base = tableroSimulado();
  obtenerMetricas.mockImplementation(base.obtenerMetricas.getMockImplementation());
  obtenerAlertas.mockImplementation(base.obtenerAlertas.getMockImplementation());
  descargarInforme.mockImplementation(base.descargarInforme.getMockImplementation());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Acceso", () => {
  it("desde la barra lateral, 'Tablero' abre /admin/dashboard", async () => {
    localStorage.setItem("bikestore_token", "token-admin");
    localStorage.setItem("bikestore_user", JSON.stringify(ADMIN));
    fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: ADMIN }));
    renderApp("/admin");

    const lateral = within(await screen.findByRole("navigation", { name: "Administración" }));
    fireEvent.click(lateral.getByRole("link", { name: "Tablero" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Tablero" })).toBeInTheDocument();
    expect(lateral.getByRole("link", { name: "Tablero" })).toHaveAttribute("aria-current", "page");
  });

  it("un cliente ve 'No autorizado' y no se piden métricas", async () => {
    await abrir("/admin/dashboard", CLIENTE);
    expect(await screen.findByRole("heading", { name: "No autorizado" })).toBeInTheDocument();
    expect(obtenerMetricas).not.toHaveBeenCalled();
  });
});

describe("Métricas (CU-17)", () => {
  it("muestra los totales y los 5 más vendidos, con las cifras de la API", async () => {
    await abrir();
    const datos = metricasDe();

    expect(resumen()).toEqual({
      "Ventas totales": formatoCOP(datos.ventas_totales),
      "Pedidos pagados": String(datos.cantidad_pedidos),
      "Unidades vendidas": String(datos.unidades_vendidas),
    });
    expect(filasVendidos()).toEqual(datos.mas_vendidos.map((p) => [p.nombre, String(p.unidades), formatoCOP(p.ventas)]));
    expect(screen.getByTestId("tablero-filtros-aplicados")).toHaveTextContent("Todo el historial · Todas las categorías");
  });

  it("dibuja una barra por producto en la gráfica, oculta para lectores de pantalla (la tabla tiene los datos)", async () => {
    const { container } = renderAppConAdmin();
    await screen.findByText("Ventas totales");

    const grafica = container.querySelector(".tablero-grafica");
    expect(grafica).toHaveAttribute("aria-hidden", "true");
    await waitFor(() => expect(grafica.querySelectorAll(".recharts-rectangle")).toHaveLength(metricasDe().mas_vendidos.length));
  });

  it("sin ventas en el periodo lo dice y no dibuja gráfica ni tabla", async () => {
    obtenerMetricas.mockResolvedValue({ ok: true, data: { ...metricasDe({ categoria: 999 }) } });
    await abrir();

    expect(screen.getByText("Sin ventas en el periodo.")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: /más vendidos/i })).not.toBeInTheDocument();
    expect(resumen()["Ventas totales"]).toBe(formatoCOP(0));
  });

  it("si la API falla, muestra el error y 'Reintentar' vuelve a pedir; las alertas se siguen viendo", async () => {
    obtenerMetricas.mockRejectedValueOnce(new ApiError("No se pudo conectar con el servidor."));
    localStorage.setItem("bikestore_token", "token-admin");
    localStorage.setItem("bikestore_user", JSON.stringify(ADMIN));
    fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: ADMIN }));
    renderApp("/admin/dashboard");

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
    expect(await screen.findByRole("region", { name: "Stock bajo" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Ventas totales")).toBeInTheDocument();
    expect(obtenerMetricas).toHaveBeenCalledTimes(2);
  });
});

describe("Filtros", () => {
  it("'Aplicar' pide las métricas con desde, hasta y categoría, y los guarda en la URL", async () => {
    await abrir();
    const categoria = CATEGORIAS[3];

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-15" } });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: String(categoria.id_categoria) } });
    expect(obtenerMetricas).toHaveBeenCalledTimes(1); // editar no pide nada todavía
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() => expect(ultimaLlamada()).toEqual({ desde: "2026-11-01", hasta: "2026-11-15", categoria: String(categoria.id_categoria) }));
    expect(await screen.findByTestId("tablero-filtros-aplicados")).toHaveTextContent(
      `Del ${formatoDia("2026-11-01")} al ${formatoDia("2026-11-15")} · ${categoria.nombre}`
    );
  });

  it("al entrar con filtros en la URL (recargar o volver), los aplica y los muestra en el formulario", async () => {
    await abrir("/admin/dashboard?desde=2026-10-01&categoria=2");

    expect(obtenerMetricas).toHaveBeenCalledWith({ desde: "2026-10-01", hasta: "", categoria: "2" });
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-10-01");
    expect(await screen.findByLabelText("Categoría")).toHaveValue("2");
    expect(screen.getByTestId("tablero-filtros-aplicados")).toHaveTextContent(`Desde el ${formatoDia("2026-10-01")} · ${CATEGORIAS[1].nombre}`);
  });

  it("no deja aplicar si 'desde' es posterior a 'hasta'", async () => {
    await abrir();

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-20" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(screen.getByRole("alert")).toHaveTextContent('La fecha "desde" no puede ser posterior a "hasta".');
    expect(screen.getByLabelText("Hasta")).toHaveAttribute("aria-invalid", "true");
    expect(obtenerMetricas).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["Este mes", { desde: "2026-11-01", hasta: "2026-11-27" }],
    ["Últimos 30 días", { desde: "2026-10-29", hasta: "2026-11-27" }],
  ])("el atajo '%s' aplica las fechas de inmediato y conserva la categoría", async (atajo, fechas) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 27, 15, 0));
    await abrir("/admin/dashboard?categoria=5");

    fireEvent.click(screen.getByRole("button", { name: atajo }));

    await waitFor(() => expect(ultimaLlamada()).toEqual({ ...fechas, categoria: "5" }));
  });

  it("'Limpiar' quita todos los filtros", async () => {
    await abrir("/admin/dashboard?desde=2026-10-01&hasta=2026-10-31&categoria=2");

    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));

    await waitFor(() => expect(ultimaLlamada()).toEqual({ desde: "", hasta: "", categoria: "" }));
    expect(screen.getByLabelText("Desde")).toHaveValue("");
  });
});

describe("Alertas (CU-16)", () => {
  it("muestra stock bajo con el umbral, agotados e inactivos en carritos, cada uno con enlace a su edición", async () => {
    await abrir();

    const bajo = tarjetaAlerta("Stock bajo");
    expect(within(bajo).getByText(`Productos activos con 1 a ${ALERTAS.umbral_stock_bajo} unidades.`)).toBeInTheDocument();
    ALERTAS.stock_bajo.forEach((p) => {
      expect(within(bajo).getByRole("link", { name: p.nombre })).toHaveAttribute("href", `/admin/productos/${p.id_producto}`);
      expect(within(bajo).getByText(`${p.existencias} unidades`)).toBeInTheDocument();
    });
    const [agotado] = ALERTAS.agotados;
    expect(within(tarjetaAlerta("Agotados")).getByRole("link", { name: agotado.nombre })).toHaveAttribute("href", `/admin/productos/${agotado.id_producto}`);
    const [inactivo] = ALERTAS.inactivos_en_carritos;
    expect(within(tarjetaAlerta("Inactivos en carritos")).getByText(`en ${inactivo.carritos} carritos`)).toBeInTheDocument();
  });

  it("los pedidos pendientes y rechazados enlazan a su detalle y a la lista ya filtrada", async () => {
    await abrir();
    const pendiente = PEDIDOS.find((p) => p.estado === "pendiente");
    const fallido = PEDIDOS.find((p) => p.estado === "fallido");

    const pendientes = tarjetaAlerta("Pedidos pendientes de pago");
    expect(within(pendientes).getByRole("link", { name: pendiente.numero_pedido })).toHaveAttribute("href", `/admin/pedidos/${pendiente.numero_pedido}`);
    expect(within(pendientes).getByRole("link", { name: "Ver todos los pendientes" })).toHaveAttribute("href", "/admin/pedidos?estado=pendiente");
    const rechazados = tarjetaAlerta("Pedidos con pago rechazado");
    expect(within(rechazados).getByRole("link", { name: fallido.numero_pedido })).toBeInTheDocument();
    expect(within(rechazados).getByRole("link", { name: "Ver todos los rechazados" })).toHaveAttribute("href", "/admin/pedidos?estado=fallido");
  });

  it("sin alertas, cada tarjeta lo dice y no hay enlaces 'Ver todos'", async () => {
    obtenerAlertas.mockResolvedValue({ ok: true, data: ALERTAS_VACIAS });
    await abrir();

    expect(await screen.findByText("Ningún producto con stock bajo.")).toBeInTheDocument();
    expect(screen.getByText("No hay pedidos pendientes.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ver todos/i })).not.toBeInTheDocument();
  });

  it("no dependen de los filtros: aplicar uno no las vuelve a pedir", async () => {
    await abrir();
    await screen.findByRole("region", { name: "Stock bajo" });

    fireEvent.click(screen.getByRole("button", { name: "Este mes" }));

    await waitFor(() => expect(obtenerMetricas).toHaveBeenCalledTimes(2));
    expect(obtenerAlertas).toHaveBeenCalledTimes(1);
  });
});

describe("Exportar (CU-18)", () => {
  let clic;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:informe");
    URL.revokeObjectURL = vi.fn();
    clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    clic.mockRestore();
  });

  it.each([
    ["Excel", "xlsx"],
    ["PDF", "pdf"],
  ])("'%s' descarga el informe con los filtros aplicados y el nombre que manda el servidor", async (texto, formato) => {
    await abrir("/admin/dashboard?desde=2026-11-01&hasta=2026-11-27&categoria=4");

    fireEvent.click(screen.getByRole("button", { name: `Descargar informe en ${texto}` }));

    await waitFor(() => expect(clic).toHaveBeenCalledTimes(1));
    expect(descargarInforme).toHaveBeenCalledWith(formato, { desde: "2026-11-01", hasta: "2026-11-27", categoria: "4" });
    expect(clic.mock.contexts[0].download).toBe(`bike-store-informe-2026-11-27.${formato}`);
    expect(clic.mock.contexts[0].href).toBe("blob:informe");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:informe");
    expect(await screen.findByText(`Informe descargado: bike-store-informe-2026-11-27.${formato}`)).toBeInTheDocument();
  });

  it("deshabilita los dos botones mientras descarga", async () => {
    let terminar;
    descargarInforme.mockImplementation(() => new Promise((resolve) => (terminar = resolve)));
    await abrir();

    fireEvent.click(screen.getByRole("button", { name: "Descargar informe en PDF" }));

    expect(screen.getByRole("button", { name: "Descargar informe en PDF" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descargar informe en Excel" })).toBeDisabled();
    expect(screen.getByText("Descargando…")).toBeInTheDocument();

    await act(async () => terminar({ blob: new Blob(["x"]), nombre: "bike-store-informe-2026-11-27.pdf" }));
    expect(screen.getByRole("button", { name: "Descargar informe en Excel" })).toBeEnabled();
  });

  it("si la API responde un error, muestra su mensaje y no descarga nada", async () => {
    descargarInforme.mockRejectedValueOnce(errorApi("La categoría no existe", 400));
    await abrir();

    fireEvent.click(screen.getByRole("button", { name: "Descargar informe en Excel" }));

    expect(await screen.findByText("La categoría no existe")).toBeInTheDocument();
    expect(clic).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Descargar informe en Excel" })).toBeEnabled();
  });
});

function renderAppConAdmin() {
  localStorage.setItem("bikestore_token", "token-admin");
  localStorage.setItem("bikestore_user", JSON.stringify(ADMIN));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: ADMIN }));
  return renderApp("/admin/dashboard");
}

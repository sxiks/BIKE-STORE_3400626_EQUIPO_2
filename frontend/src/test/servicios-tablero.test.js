// F4 · Servicios del tablero: armado de la consulta y descarga de archivos con apiArchivo (services/api.js).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiArchivo, registrarManejadorSesionInvalida } from "../services/api";
import { consulta, descargarInforme } from "../services/dashboard.service";
import { listarPedidosAdmin } from "../services/pedidos.service";
import { API_URL } from "../config/env";

function respuestaArchivo(status, { cuerpo = "archivo", json = null, disposicion = null } = {}) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(disposicion ? { "Content-Disposition": disposicion } : {}),
    blob: () => Promise.resolve(new Blob([cuerpo])),
    json: () => (json ? Promise.resolve(json) : Promise.reject(new Error("no es JSON"))),
  });
}

let fetchMock;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("bikestore_token", "token-admin");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("consulta()", () => {
  it("solo incluye los filtros con valor, sin espacios de sobra", () => {
    expect(consulta({ desde: "2026-11-01", hasta: "", categoria: null, q: "  ana " })).toBe("?desde=2026-11-01&q=ana");
    expect(consulta({})).toBe("");
  });
});

describe("apiArchivo()", () => {
  it("devuelve el blob y el nombre de Content-Disposition, con el token", async () => {
    fetchMock.mockReturnValue(respuestaArchivo(200, { disposicion: 'attachment; filename="bike-store-informe-2026-11-27.pdf"' }));

    const { blob, nombre } = await descargarInforme("pdf", { desde: "2026-11-01", hasta: "", categoria: "4" });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/dashboard/exportar?formato=pdf&desde=2026-11-01&categoria=4`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-admin" }) })
    );
    expect(await blob.text()).toBe("archivo");
    expect(nombre).toBe("bike-store-informe-2026-11-27.pdf");
  });

  it("sin Content-Disposition, el nombre es null", async () => {
    fetchMock.mockReturnValue(respuestaArchivo(200));
    expect((await apiArchivo("/x")).nombre).toBeNull();
  });

  it("un error de la API (JSON) se lanza como ApiError con su mensaje", async () => {
    fetchMock.mockReturnValue(respuestaArchivo(400, { json: { ok: false, message: "El campo formato debe ser uno de: xlsx, pdf" } }));

    await expect(apiArchivo("/dashboard/exportar")).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "El campo formato debe ser uno de: xlsx, pdf",
    });
  });

  it("un 401 cierra la sesión igual que api()", async () => {
    const manejador = vi.fn();
    const quitar = registrarManejadorSesionInvalida(manejador);
    fetchMock.mockReturnValue(respuestaArchivo(401, { json: { ok: false, message: "Token inválido o vencido" } }));

    await expect(apiArchivo("/dashboard/exportar?formato=xlsx")).rejects.toBeInstanceOf(ApiError);
    expect(manejador).toHaveBeenCalledTimes(1);
    quitar();
  });
});

describe("listarPedidosAdmin()", () => {
  it("pide /pedidos/admin solo con los filtros que tienen valor", async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: [] }) }));

    await listarPedidosAdmin({ q: "BS-2026", estado: "pendiente", desde: "", hasta: "" });

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/pedidos/admin?q=BS-2026&estado=pendiente`);
  });
});

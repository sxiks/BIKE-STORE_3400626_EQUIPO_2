// F1.2 · Rutas protegidas por rol (CU-22, RF-30).
// La API se simula con un fetch falso: estas pruebas no necesitan el backend encendido.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";

const CLIENTE = { id_usuario: 2, nombre: "Ana Cliente", email: "ana@prueba.local", rol: "cliente", estado: "activo" };
const ADMIN = { id_usuario: 1, nombre: "Admin Tienda", email: "admin@prueba.local", rol: "admin", estado: "activo" };

const nav = () => within(screen.getByRole("navigation", { name: "Principal" }));

let fetchMock;

// Deja una sesión guardada y hace que /auth/me la confirme (como pasa al recargar la página).
function conSesion(usuario) {
  localStorage.setItem("bikestore_token", `token-${usuario.rol}`);
  localStorage.setItem("bikestore_user", JSON.stringify(usuario));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: usuario }));
}

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Sin sesión", () => {
  it("/admin lleva al login y, al iniciar sesión, vuelve a /admin", async () => {
    fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: { user: ADMIN, token: "token-admin" } }));
    renderApp("/admin");

    expect(screen.getByRole("heading", { name: /inicia sesión para continuar/i })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Correo"), { target: { value: ADMIN.email } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "Clave1234" } });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByRole("heading", { name: "Panel de administración" })).toBeInTheDocument();
  });

  it("/cuenta también lleva al login", () => {
    renderApp("/cuenta");

    expect(screen.getByRole("heading", { name: /inicia sesión para continuar/i })).toBeInTheDocument();
  });

  it("un login que no viene de una ruta protegida sigue llevando a la tienda", async () => {
    fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: { user: CLIENTE, token: "token-cliente" } }));
    renderApp("/login");

    fireEvent.change(screen.getByPlaceholderText("Correo"), { target: { value: CLIENTE.email } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "Clave1234" } });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByRole("button", { name: /abrir carrito/i })).toBeInTheDocument();
  });
});

describe("Con sesión de cliente", () => {
  beforeEach(() => conSesion(CLIENTE));

  it("en /admin ve 'No autorizado' en la misma URL, con enlace a la tienda", async () => {
    renderApp("/admin");

    expect(await screen.findByRole("heading", { name: "No autorizado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /volver a la tienda/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("heading", { name: "Panel de administración" })).not.toBeInTheDocument();
  });

  it("en /cuenta ve su cuenta", async () => {
    renderApp("/cuenta");

    expect(await screen.findByRole("heading", { name: "Mi cuenta" })).toBeInTheDocument();
    expect(screen.getByText(/ana@prueba\.local/)).toBeInTheDocument();
  });

  it("la navbar muestra 'Mi cuenta' y no 'Administración'", async () => {
    renderApp("/");

    expect(await nav().findByRole("link", { name: /mi cuenta/i })).toHaveAttribute("href", "/cuenta");
    expect(nav().queryByRole("link", { name: /administración/i })).not.toBeInTheDocument();
  });
});

describe("Con sesión de administrador", () => {
  beforeEach(() => conSesion(ADMIN));

  it("en /admin ve el panel de administración", async () => {
    renderApp("/admin");

    expect(await screen.findByRole("heading", { name: "Panel de administración" })).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
  });

  it("en /cuenta ve 'No autorizado' (el carrito y los pedidos son solo de clientes)", async () => {
    renderApp("/cuenta");

    expect(await screen.findByRole("heading", { name: "No autorizado" })).toBeInTheDocument();
  });

  it("la navbar muestra 'Administración' y no 'Mi cuenta'", async () => {
    renderApp("/");

    expect(await nav().findByRole("link", { name: /administración/i })).toHaveAttribute("href", "/admin");
    expect(nav().queryByRole("link", { name: /mi cuenta/i })).not.toBeInTheDocument();
  });
});

describe("Mientras se valida la sesión guardada", () => {
  it("muestra 'Verificando sesión…' y no redirige hasta que /auth/me responde", async () => {
    localStorage.setItem("bikestore_token", "token-admin");
    localStorage.setItem("bikestore_user", JSON.stringify(ADMIN));
    let responder;
    fetchMock.mockImplementation(() => new Promise((resolve) => { responder = resolve; }));
    renderApp("/admin");

    expect(screen.getByRole("status")).toHaveTextContent("Verificando sesión…");
    expect(screen.queryByRole("heading", { name: /inicia sesión/i })).not.toBeInTheDocument();

    responder({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: ADMIN }) });
    expect(await screen.findByRole("heading", { name: "Panel de administración" })).toBeInTheDocument();
  });

  it("si el token resultó inválido, termina en el login", async () => {
    localStorage.setItem("bikestore_token", "token-vencido");
    localStorage.setItem("bikestore_user", JSON.stringify(ADMIN));
    fetchMock.mockImplementation(() => respuesta(401, { ok: false, message: "Token inválido o expirado" }));
    renderApp("/admin");

    expect(await screen.findByRole("heading", { name: /inicia sesión para continuar/i })).toBeInTheDocument();
  });
});

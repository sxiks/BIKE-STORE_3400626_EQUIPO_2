// F1.1 · Sesión y navbar unificada (CU-10, CU-22).
// La API se simula con un fetch falso: estas pruebas no necesitan el backend encendido.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { api, ApiError } from "../services/api";
import { renderApp, respuesta } from "./utils";

const CLIENTE = { id_usuario: 2, nombre: "Ana Cliente", email: "ana@prueba.local", rol: "cliente", estado: "activo" };
const TOKEN = "token-de-prueba";

const nav = () => within(screen.getByRole("navigation", { name: "Principal" }));
const guardarSesion = (user = CLIENTE, token = TOKEN) => {
  localStorage.setItem("bikestore_token", token);
  localStorage.setItem("bikestore_user", JSON.stringify(user));
};

let fetchMock;

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Hace que fetch responda según la ruta pedida: { "/auth/me": () => respuesta(...) }
function simularApi(rutas) {
  fetchMock.mockImplementation((url) => {
    const ruta = Object.keys(rutas).find((r) => url.endsWith(r));
    return ruta ? rutas[ruta]() : respuesta(500, { ok: false, message: "Respuesta no simulada" });
  });
}

describe("Navbar unificada", () => {
  it("sin sesión muestra la marca BIKE STORE y los enlaces de iniciar sesión y registro", () => {
    renderApp("/");

    expect(nav().getByRole("link", { name: /bike store/i })).toHaveAttribute("href", "/");
    expect(nav().getByRole("link", { name: /iniciar sesión/i })).toHaveAttribute("href", "/login");
    expect(nav().getByRole("link", { name: /registrarme/i })).toHaveAttribute("href", "/registro");
    expect(screen.queryByTestId("usuario-sesion")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled(); // sin token no se valida nada
  });

  it("también aparece en las páginas de login y registro (sin el botón del carrito)", () => {
    renderApp("/login");

    expect(nav().getByRole("link", { name: /bike store/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /abrir carrito/i })).not.toBeInTheDocument();
  });

  it("al iniciar sesión muestra el nombre y el rol, y guarda la sesión con las claves bikestore_*", async () => {
    simularApi({ "/auth/login": () => respuesta(200, { ok: true, data: { user: CLIENTE, token: TOKEN } }) });
    renderApp("/login");

    fireEvent.change(screen.getByPlaceholderText("Correo"), { target: { value: CLIENTE.email } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "Clave1234" } });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    const usuario = await screen.findByTestId("usuario-sesion");
    expect(usuario).toHaveTextContent("Ana Cliente");
    expect(usuario).toHaveTextContent("cliente");
    expect(nav().getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /abrir carrito/i })).toBeInTheDocument(); // volvió a la tienda
    expect(localStorage.getItem("bikestore_token")).toBe(TOKEN);
    expect(JSON.parse(localStorage.getItem("bikestore_user"))).toMatchObject({ email: CLIENTE.email });
  });

  it("cerrar sesión borra la sesión guardada, vuelve a mostrar los enlaces y avisa con un toast", async () => {
    guardarSesion();
    simularApi({ "/auth/me": () => respuesta(200, { ok: true, data: CLIENTE }) });
    renderApp("/");

    fireEvent.click(await nav().findByRole("button", { name: /cerrar sesión/i }));

    expect(nav().getByRole("link", { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(localStorage.getItem("bikestore_token")).toBeNull();
    expect(localStorage.getItem("bikestore_user")).toBeNull();
    expect(screen.getByText("Cerraste sesión")).toBeInTheDocument();
  });
});

describe("Sesión guardada al abrir la app", () => {
  it("borra las claves antiguas labcrud_* del Laboratorio", () => {
    localStorage.setItem("labcrud_token", "viejo");
    localStorage.setItem("labcrud_user", JSON.stringify(CLIENTE));
    renderApp("/");

    expect(localStorage.getItem("labcrud_token")).toBeNull();
    expect(localStorage.getItem("labcrud_user")).toBeNull();
    expect(nav().getByRole("link", { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it("valida el token con GET /auth/me y actualiza el rol con el dato actual de la base", async () => {
    guardarSesion(CLIENTE); // guardado como cliente...
    simularApi({ "/auth/me": () => respuesta(200, { ok: true, data: { ...CLIENTE, rol: "admin" } }) }); // ...ahora es admin
    renderApp("/");

    await waitFor(() => expect(screen.getByTestId("usuario-sesion")).toHaveTextContent("admin"));
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/me$/);
    expect(opciones.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(localStorage.getItem("bikestore_user")).rol).toBe("admin");
  });

  it("si el token ya no es válido (401), cierra la sesión y avisa", async () => {
    guardarSesion();
    simularApi({ "/auth/me": () => respuesta(401, { ok: false, message: "Token inválido o expirado" }) });
    renderApp("/");

    expect(await screen.findByText("Tu sesión venció. Inicia sesión de nuevo.")).toBeInTheDocument();
    expect(nav().getByRole("link", { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(localStorage.getItem("bikestore_token")).toBeNull();
  });

  it("si la API no responde, conserva la sesión (no se puede saber si el token es válido)", async () => {
    guardarSesion();
    fetchMock.mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));
    renderApp("/");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByTestId("usuario-sesion")).toHaveTextContent("Ana Cliente");
    expect(localStorage.getItem("bikestore_token")).toBe(TOKEN);
  });
});

describe("Manejo global de sesión inválida (services/api.js)", () => {
  it("un 403 CUENTA_DESACTIVADA en cualquier petición cierra la sesión, muestra el mensaje y lleva a /login", async () => {
    const mensaje = "Tu cuenta está desactivada. Contacta al administrador";
    guardarSesion();
    simularApi({
      "/auth/me": () => respuesta(200, { ok: true, data: CLIENTE }),
      "/carrito": () => respuesta(403, { ok: false, message: mensaje, code: "CUENTA_DESACTIVADA" })
    });
    renderApp("/");
    await screen.findByTestId("usuario-sesion");

    // Una petición cualquiera de la app (por ejemplo, el carrito del Sprint 3).
    await act(async () => {
      await expect(api("/carrito")).rejects.toMatchObject({ status: 403, code: "CUENTA_DESACTIVADA" });
    });

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /inicia sesión para continuar/i })).toBeInTheDocument();
    expect(localStorage.getItem("bikestore_token")).toBeNull();
  });

  it("un 401 en el login (sin token) NO activa el manejo global: el error se muestra en el formulario", async () => {
    simularApi({ "/auth/login": () => respuesta(401, { ok: false, message: "Credenciales incorrectas" }) });
    renderApp("/login");

    fireEvent.change(screen.getByPlaceholderText("Correo"), { target: { value: CLIENTE.email } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "Equivocada1" } });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByText("Credenciales incorrectas")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument(); // ningún toast
    expect(screen.getByRole("heading", { name: /inicia sesión para continuar/i })).toBeInTheDocument();
  });

  it("los errores de la API llegan como ApiError con status, code y data", async () => {
    fetchMock.mockImplementation(() =>
      respuesta(400, { ok: false, message: "Supera el stock", code: "STOCK_MAXIMO", data: { maximo: 3 } })
    );

    const error = await api("/carrito/items", { method: "POST" }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Supera el stock", status: 400, code: "STOCK_MAXIMO", data: { maximo: 3 } });
  });

  it("si el servidor no responde, el error lo explica (status 0)", async () => {
    fetchMock.mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));

    const error = await api("/productos").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/no se pudo conectar con el servidor/i);
  });
});

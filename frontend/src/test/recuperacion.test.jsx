// F1.3 · Registro con validaciones y recuperación de contraseña (CU-09, CU-11, D7, D8).
// La API se simula con un fetch falso: estas pruebas no necesitan el backend encendido.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";

const TOKEN = "a".repeat(64);
const MSG_RECUPERAR = "Si el correo está registrado, se generó un enlace de recuperación";
const MSG_TOKEN_INVALIDO = "El enlace de recuperación no es válido o ya venció";

let fetchMock;

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// fetch responde según la ruta pedida: { "/auth/recuperar": () => respuesta(...) }
function simularApi(rutas) {
  fetchMock.mockImplementation((url) => {
    const ruta = Object.keys(rutas).find((r) => url.endsWith(r));
    return ruta ? rutas[ruta]() : respuesta(500, { ok: false, message: "Respuesta no simulada" });
  });
}

const escribir = (placeholder, valor) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: valor } });
const cuerpoEnviado = (indice = 0) => JSON.parse(fetchMock.mock.calls[indice][1].body);

describe("Registro (CU-09)", () => {
  function llenarRegistro({ nombre = "Ana Cliente", email = "ana@prueba.local", password = "Clave1234" } = {}) {
    escribir("Nombre", nombre);
    escribir("Correo", email);
    escribir("Contraseña", password);
  }

  it("con datos inválidos muestra un error junto a cada campo y no llama a la API", () => {
    renderApp("/registro");
    llenarRegistro({ nombre: " ", email: "ana@", password: "clave" });
    fireEvent.click(screen.getByRole("button", { name: /registrarme/i }));

    expect(screen.getByText("Escribe tu nombre")).toBeInTheDocument();
    expect(screen.getByText("El correo no tiene un formato válido")).toBeInTheDocument();
    expect(screen.getByText(/mínimo 8 caracteres, con mayúscula/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Correo")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no muestra errores de un campo hasta que el usuario sale de él", () => {
    renderApp("/registro");
    escribir("Correo", "ana@");
    expect(screen.queryByText("El correo no tiene un formato válido")).not.toBeInTheDocument();

    fireEvent.blur(screen.getByPlaceholderText("Correo"));
    expect(screen.getByText("El correo no tiene un formato válido")).toBeInTheDocument();
  });

  it("marca las reglas de contraseña D7 mientras se escribe", () => {
    renderApp("/registro");
    escribir("Contraseña", "clave1");

    expect(screen.getByText("Una letra minúscula").closest("li")).toHaveClass("reglas-password__item--cumple");
    expect(screen.getByText("Un número").closest("li")).toHaveClass("reglas-password__item--cumple");
    expect(screen.getByText("Una letra mayúscula").closest("li")).not.toHaveClass("reglas-password__item--cumple");
    expect(screen.getByText("Mínimo 8 caracteres").closest("li")).not.toHaveClass("reglas-password__item--cumple");
  });

  it("con 409 muestra el mensaje del backend junto al correo", async () => {
    simularApi({
      "/auth/register": () => respuesta(409, { ok: false, message: "El correo ya está registrado" })
    });
    renderApp("/registro");
    llenarRegistro();
    fireEvent.click(screen.getByRole("button", { name: /registrarme/i }));

    const error = await screen.findByText("El correo ya está registrado");
    expect(error).toHaveAttribute("id", "registro-email-error");
    expect(screen.getByPlaceholderText("Correo")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: /registrarme/i })).toBeEnabled();
  });

  it("deshabilita el botón mientras envía y al terminar lleva a /login con un aviso", async () => {
    let responder;
    simularApi({ "/auth/register": () => new Promise((resolve) => { responder = resolve; }) });
    renderApp("/registro");
    llenarRegistro({ nombre: "  Ana Cliente  ", email: "  ana@prueba.local " });
    fireEvent.click(screen.getByRole("button", { name: /registrarme/i }));

    expect(await screen.findByRole("button", { name: /registrando/i })).toBeDisabled();
    expect(cuerpoEnviado()).toEqual({ nombre: "Ana Cliente", email: "ana@prueba.local", password: "Clave1234" });

    responder({ ok: true, status: 201, json: () => Promise.resolve({ ok: true, data: {} }) });
    expect(await screen.findByText("Cuenta creada. Ya puedes iniciar sesión")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /inicia sesión para continuar/i })).toBeInTheDocument();
  });
});

describe("Recuperar contraseña (CU-11)", () => {
  it("el login tiene el enlace ¿Olvidaste tu contraseña?", () => {
    renderApp("/login");
    expect(screen.getByRole("link", { name: /olvidaste tu contraseña/i })).toHaveAttribute("href", "/recuperar");
  });

  it("valida el correo antes de llamar a la API", () => {
    renderApp("/recuperar");
    escribir("Correo", "ana");
    fireEvent.click(screen.getByRole("button", { name: /enviar enlace/i }));

    expect(screen.getByText("El correo no tiene un formato válido")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("muestra siempre el message del backend, sin aviso de desarrollo si no llega token", async () => {
    simularApi({ "/auth/recuperar": () => respuesta(200, { ok: true, message: MSG_RECUPERAR }) });
    renderApp("/recuperar");
    escribir("Correo", "nadie@prueba.local");
    fireEvent.click(screen.getByRole("button", { name: /enviar enlace/i }));

    expect(await screen.findByTestId("respuesta-recuperar")).toHaveTextContent(MSG_RECUPERAR);
    expect(cuerpoEnviado()).toEqual({ email: "nadie@prueba.local" });
    expect(screen.queryByTestId("aviso-desarrollo")).not.toBeInTheDocument();
  });

  it("en desarrollo, con token_desarrollo, muestra el enlace a /restablecer", async () => {
    simularApi({
      "/auth/recuperar": () => respuesta(200, { ok: true, message: MSG_RECUPERAR, data: { token_desarrollo: TOKEN } })
    });
    renderApp("/recuperar");
    escribir("Correo", "ana@prueba.local");
    fireEvent.click(screen.getByRole("button", { name: /enviar enlace/i }));

    const aviso = await screen.findByTestId("aviso-desarrollo");
    expect(aviso).toHaveTextContent(/modo desarrollo/i);
    expect(screen.getByRole("link", { name: /restablecer contraseña/i })).toHaveAttribute(
      "href",
      `/restablecer?token=${TOKEN}`
    );
  });

  it("fuera de desarrollo nunca muestra el enlace, aunque la API envíe el token", async () => {
    vi.stubEnv("DEV", false);
    simularApi({
      "/auth/recuperar": () => respuesta(200, { ok: true, message: MSG_RECUPERAR, data: { token_desarrollo: TOKEN } })
    });
    renderApp("/recuperar");
    escribir("Correo", "ana@prueba.local");
    fireEvent.click(screen.getByRole("button", { name: /enviar enlace/i }));

    expect(await screen.findByTestId("respuesta-recuperar")).toHaveTextContent(MSG_RECUPERAR);
    expect(screen.queryByTestId("aviso-desarrollo")).not.toBeInTheDocument();
  });
});

describe("Restablecer contraseña (CU-11)", () => {
  it("sin token en la URL no muestra el formulario y ofrece pedir otro enlace", () => {
    renderApp("/restablecer");

    expect(screen.getByRole("alert")).toHaveTextContent(MSG_TOKEN_INVALIDO);
    expect(screen.getByRole("link", { name: /solicitar un enlace nuevo/i })).toHaveAttribute("href", "/recuperar");
    expect(screen.queryByPlaceholderText("Contraseña nueva")).not.toBeInTheDocument();
  });

  it("si las contraseñas no coinciden no llama a la API", () => {
    renderApp(`/restablecer?token=${TOKEN}`);
    escribir("Contraseña nueva", "Clave1234");
    escribir("Repite la contraseña", "Clave12345");
    fireEvent.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con TOKEN_INVALIDO muestra el mensaje y el enlace a /recuperar", async () => {
    simularApi({
      "/auth/restablecer": () =>
        respuesta(400, { ok: false, message: MSG_TOKEN_INVALIDO, code: "TOKEN_INVALIDO" })
    });
    renderApp(`/restablecer?token=${TOKEN}`);
    escribir("Contraseña nueva", "Clave1234");
    escribir("Repite la contraseña", "Clave1234");
    fireEvent.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    expect(await screen.findByRole("link", { name: /solicitar un enlace nuevo/i })).toHaveAttribute("href", "/recuperar");
    expect(screen.getByRole("alert")).toHaveTextContent(MSG_TOKEN_INVALIDO);
    expect(screen.queryByPlaceholderText("Contraseña nueva")).not.toBeInTheDocument();
  });

  it("con éxito envía el token y la contraseña, avisa y lleva a /login", async () => {
    simularApi({
      "/auth/restablecer": () =>
        respuesta(200, { ok: true, message: "Contraseña actualizada. Ya puedes iniciar sesión" })
    });
    renderApp(`/restablecer?token=${TOKEN}`);
    escribir("Contraseña nueva", "Clave1234");
    escribir("Repite la contraseña", "Clave1234");
    fireEvent.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    expect(await screen.findByText("Contraseña actualizada. Ya puedes iniciar sesión")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /inicia sesión para continuar/i })).toBeInTheDocument();
    expect(cuerpoEnviado()).toEqual({ token: TOKEN, password: "Clave1234" });
  });
});

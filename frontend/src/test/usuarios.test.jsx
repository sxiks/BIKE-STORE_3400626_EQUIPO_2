// F1.4 · Panel de usuarios del administrador (CU-19, CU-20, CU-21).
// Los servicios se simulan: estas pruebas no necesitan el backend encendido.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";
import { ApiError } from "../services/api";
import { cambiarEstado, cambiarRol, listarUsuarios } from "../services/usuarios.service";

vi.mock("../services/usuarios.service", () => ({
  listarUsuarios: vi.fn(),
  cambiarRol: vi.fn(),
  cambiarEstado: vi.fn(),
}));

const ADMIN = { id_usuario: 1, nombre: "Admin Tienda", email: "admin@prueba.local", rol: "admin", estado: "activo" };
const ANA = { id_usuario: 2, nombre: "Ana Cliente", email: "ana@prueba.local", rol: "cliente", estado: "activo" };
const LUIS = { id_usuario: 3, nombre: "Luis Perez", email: "luis@prueba.local", rol: "cliente", estado: "inactivo" };

let fetchMock;

// Sesión guardada que /auth/me confirma (como al recargar la página).
function conSesion(usuario) {
  localStorage.setItem("bikestore_token", `token-${usuario.rol}`);
  localStorage.setItem("bikestore_user", JSON.stringify(usuario));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: usuario }));
}

async function abrirPanel() {
  conSesion(ADMIN);
  renderApp("/admin/usuarios");
  await screen.findByRole("table");
}

const boton = (nombre) => screen.getByRole("button", { name: nombre });

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  listarUsuarios.mockResolvedValue({ ok: true, data: [ADMIN, ANA, LUIS] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Acceso", () => {
  it("un cliente ve 'No autorizado' en /admin/usuarios y no se pide el listado", async () => {
    conSesion({ id_usuario: 9, nombre: "Cli", email: "cli@prueba.local", rol: "cliente", estado: "activo" });
    renderApp("/admin/usuarios");

    expect(await screen.findByRole("heading", { name: "No autorizado" })).toBeInTheDocument();
    expect(listarUsuarios).not.toHaveBeenCalled();
  });

  it("sin sesión lleva al login", () => {
    renderApp("/admin/usuarios");

    expect(screen.getByRole("heading", { name: /inicia sesión para continuar/i })).toBeInTheDocument();
  });

  it("desde el inicio del panel, la tarjeta 'Usuarios' lleva a la página", async () => {
    conSesion(ADMIN);
    renderApp("/admin");

    fireEvent.click(await screen.findByRole("link", { name: "Usuarios" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Usuarios" })).toBeInTheDocument();
  });
});

describe("Listado y filtros", () => {
  it("muestra nombre, correo, rol y estado de cada usuario", async () => {
    await abrirPanel();

    const fila = within(screen.getByRole("row", { name: /ana cliente/i }));
    expect(fila.getByText("ana@prueba.local")).toBeInTheDocument();
    expect(fila.getByText("Cliente")).toBeInTheDocument();
    expect(fila.getByText("Activo")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /luis perez/i })).getByText("Inactivo")).toBeInTheDocument();
    expect(listarUsuarios).toHaveBeenCalledWith({ q: "", rol: "", estado: "" });
  });

  it("buscar por texto envía q a la API", async () => {
    await abrirPanel();

    fireEvent.change(screen.getByLabelText(/buscar por nombre o correo/i), { target: { value: "ana" } });

    await waitFor(() => expect(listarUsuarios).toHaveBeenLastCalledWith({ q: "ana", rol: "", estado: "" }));
  });

  it("filtrar por rol y por estado envía rol y estado a la API", async () => {
    await abrirPanel();

    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "cliente" } });
    await waitFor(() => expect(listarUsuarios).toHaveBeenLastCalledWith({ q: "", rol: "cliente", estado: "" }));

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "inactivo" } });
    await waitFor(() => expect(listarUsuarios).toHaveBeenLastCalledWith({ q: "", rol: "cliente", estado: "inactivo" }));
  });

  it("muestra 'Cargando usuarios…' mientras llega la primera respuesta", async () => {
    conSesion(ADMIN);
    listarUsuarios.mockReturnValue(new Promise(() => {}));
    renderApp("/admin/usuarios");

    expect(await screen.findByText("Cargando usuarios…")).toBeInTheDocument();
  });

  it("sin usuarios y sin filtros dice que aún no hay usuarios", async () => {
    conSesion(ADMIN);
    listarUsuarios.mockResolvedValue({ ok: true, data: [] });
    renderApp("/admin/usuarios");

    expect(await screen.findByText("Aún no hay usuarios registrados.")).toBeInTheDocument();
  });

  it("si la búsqueda no encuentra a nadie, lo explica y sugiere cambiar los datos", async () => {
    await abrirPanel();
    listarUsuarios.mockResolvedValue({ ok: true, data: [] });

    fireEvent.change(screen.getByLabelText(/buscar por nombre o correo/i), { target: { value: "zzz" } });

    expect(await screen.findByText(/ningún usuario coincide/i)).toBeInTheDocument();
  });

  it("si la API falla, muestra el mensaje y 'Reintentar' vuelve a pedir el listado", async () => {
    conSesion(ADMIN);
    listarUsuarios.mockRejectedValueOnce(new ApiError("No se pudo conectar con el servidor.", { status: 0 }));
    renderApp("/admin/usuarios");

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(listarUsuarios).toHaveBeenCalledTimes(2);
  });
});

describe("Fila del propio administrador (D5 y D6)", () => {
  it("tiene ambas acciones deshabilitadas; las demás filas no", async () => {
    await abrirPanel();

    expect(boton("Hacer cliente a Admin Tienda")).toBeDisabled();
    expect(boton("Desactivar a Admin Tienda")).toBeDisabled();
    expect(boton("Hacer administrador a Ana Cliente")).toBeEnabled();
    expect(boton("Desactivar a Ana Cliente")).toBeEnabled();
  });
});

describe("Cambiar rol (CU-20)", () => {
  it("pide confirmación, llama a la API y actualiza solo esa fila", async () => {
    await abrirPanel();
    cambiarRol.mockResolvedValue({ ok: true, data: { ...ANA, rol: "admin" } });

    fireEvent.click(boton("Hacer administrador a Ana Cliente"));

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent(/hacer administrador a ana cliente/i);
    expect(cambiarRol).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole("button", { name: /sí, hacer administrador/i }));

    await waitFor(() => expect(cambiarRol).toHaveBeenCalledWith(2, "admin"));
    expect(await screen.findByText("Ana Cliente ahora es administrador.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(boton("Hacer cliente a Ana Cliente")).toBeInTheDocument();
    expect(listarUsuarios).toHaveBeenCalledTimes(1); // no se recargó todo el listado
  });

  it("cancelar (botón o Escape) cierra el diálogo y no llama a la API", async () => {
    await abrirPanel();

    fireEvent.click(boton("Hacer administrador a Ana Cliente"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(boton("Hacer administrador a Ana Cliente"));
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(cambiarRol).not.toHaveBeenCalled();
  });

  it("si llega ACCION_SOBRE_SI_MISMO, muestra el mensaje del backend", async () => {
    await abrirPanel();
    cambiarRol.mockRejectedValue(
      new ApiError("No puedes cambiar tu propio rol", { status: 400, code: "ACCION_SOBRE_SI_MISMO" })
    );

    fireEvent.click(boton("Hacer administrador a Ana Cliente"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /sí, hacer administrador/i }));

    expect(await screen.findByText("No puedes cambiar tu propio rol")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Cambiar estado (CU-21)", () => {
  it("desactivar pide confirmación, llama a la API y actualiza la fila", async () => {
    await abrirPanel();
    cambiarEstado.mockResolvedValue({ ok: true, data: { ...ANA, estado: "inactivo" } });

    fireEvent.click(boton("Desactivar a Ana Cliente"));

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent(/desactivar la cuenta de ana cliente/i);

    fireEvent.click(within(dialogo).getByRole("button", { name: /sí, desactivar/i }));

    await waitFor(() => expect(cambiarEstado).toHaveBeenCalledWith(2, "inactivo"));
    expect(await screen.findByText("La cuenta de Ana Cliente quedó desactivada.")).toBeInTheDocument();
    expect(boton("Activar a Ana Cliente")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /ana cliente/i })).getByText("Inactivo")).toBeInTheDocument();
  });

  it("activar una cuenta inactiva llama a la API con 'activo'", async () => {
    await abrirPanel();
    cambiarEstado.mockResolvedValue({ ok: true, data: { ...LUIS, estado: "activo" } });

    fireEvent.click(boton("Activar a Luis Perez"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /sí, activar/i }));

    await waitFor(() => expect(cambiarEstado).toHaveBeenCalledWith(3, "activo"));
    expect(await screen.findByText("La cuenta de Luis Perez quedó activa.")).toBeInTheDocument();
  });

  it("si el usuario ya no existe (404), avisa y vuelve a pedir el listado", async () => {
    await abrirPanel();
    cambiarEstado.mockRejectedValue(new ApiError("Usuario no encontrado", { status: 404 }));

    fireEvent.click(boton("Desactivar a Ana Cliente"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /sí, desactivar/i }));

    expect(await screen.findByText("Usuario no encontrado")).toBeInTheDocument();
    await waitFor(() => expect(listarUsuarios).toHaveBeenCalledTimes(2));
  });
});

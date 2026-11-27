// F2.3 · Panel de productos del administrador (CU-12, CU-13, CU-14, CU-15).
// F2.4 · Eliminar un producto desde su edición (decisión M), al final de este archivo.
// Los servicios se simulan con el catálogo de prueba (fixtures/catalogo.js): no se escriben nombres ni
// cantidades a mano, y si la semilla crece estas pruebas siguen valiendo.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderApp, respuesta } from "./utils";
import { ApiError } from "../services/api";
import {
  actualizarProducto,
  cambiarEstadoProducto,
  crearProducto,
  eliminarProducto,
  listarProductosAdmin,
  obtenerProductoAdmin,
} from "../services/productos.service";
import { CATEGORIAS, PRODUCTOS, agotado, catalogoAdmin, productoPorId, servicioSimulado, unActivo, unInactivo } from "./fixtures/catalogo";
import { IMAGEN_MAX_BYTES } from "../utils/validaciones";

vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());

const ADMIN = { id_usuario: 1, nombre: "Admin Tienda", email: "admin@prueba.local", rol: "admin", estado: "activo" };
const ADMIN_FNS = { listarProductosAdmin, obtenerProductoAdmin, crearProducto, actualizarProducto, cambiarEstadoProducto, eliminarProducto };

let fetchMock;

function conSesion(usuario = ADMIN) {
  localStorage.setItem("bikestore_token", `token-${usuario.rol}`);
  localStorage.setItem("bikestore_user", JSON.stringify(usuario));
  fetchMock.mockImplementation(() => respuesta(200, { ok: true, data: usuario }));
}

async function abrirListado() {
  conSesion();
  renderApp("/admin/productos");
  await screen.findByRole("table");
}

async function abrirFormulario(ruta) {
  conSesion();
  renderApp(ruta);
  return screen.findByRole("form");
}

const filas = () => within(screen.getByRole("table")).getAllByRole("row").slice(1); // sin el encabezado
const fila = (nombre) => filas().find((f) => within(f).queryByText(nombre));
const imagen = (tipo = "image/png", bytes = 64) => new File(["a".repeat(bytes)], "foto-producto", { type: tipo });
const escribir = (etiqueta, valor) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
const elegirImagen = (archivo) => fireEvent.change(screen.getByLabelText("Imagen"), { target: { files: [archivo] } });
const enviados = (mock) => Object.fromEntries(mock.mock.calls.at(-1).at(-1).entries()); // FormData → objeto

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(() => respuesta(500, { ok: false, message: "Respuesta no simulada" }));
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  // Cada prueba empieza con el comportamiento del catálogo de prueba, aunque otra lo haya cambiado.
  const base = servicioSimulado();
  Object.entries(ADMIN_FNS).forEach(([nombre, fn]) => fn.mockImplementation(base[nombre].getMockImplementation()));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Acceso", () => {
  it("un cliente ve 'No autorizado' y no se pide el listado", async () => {
    conSesion({ id_usuario: 9, nombre: "Cli", email: "cli@prueba.local", rol: "cliente", estado: "activo" });
    renderApp("/admin/productos");

    expect(await screen.findByRole("heading", { name: "No autorizado" })).toBeInTheDocument();
    expect(listarProductosAdmin).not.toHaveBeenCalled();
  });

  it("la barra lateral lleva a Productos y la marca como sección activa", async () => {
    conSesion();
    renderApp("/admin");

    const lateral = within(await screen.findByRole("navigation", { name: "Administración" }));
    fireEvent.click(lateral.getByRole("link", { name: "Productos" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Productos" })).toBeInTheDocument();
    expect(lateral.getByRole("link", { name: "Productos" })).toHaveAttribute("aria-current", "page");
  });

  it("desde el inicio del panel, la tarjeta 'Productos' lleva a la página", async () => {
    conSesion();
    renderApp("/admin");

    fireEvent.click(within(await screen.findByRole("main")).getByRole("link", { name: "Productos" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Productos" })).toBeInTheDocument();
  });
});

describe("Listado (CU-15)", () => {
  it("muestra todos los productos, incluidos los inactivos y los agotados", async () => {
    await abrirListado();

    expect(listarProductosAdmin).toHaveBeenCalledWith({ q: "", categoria: "", estado: "" });
    expect(filas()).toHaveLength(PRODUCTOS.length);
    expect(screen.getByText(`${PRODUCTOS.length} productos`)).toBeInTheDocument();

    const inactivo = unInactivo();
    expect(within(fila(inactivo.nombre)).getByText("Inactivo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Activar ${inactivo.nombre}` })).toBeInTheDocument();
    expect(within(fila(agotado().nombre)).getByText("Agotado")).toBeInTheDocument();
  });

  it("busca por nombre después de dejar de escribir", async () => {
    await abrirListado();
    const buscado = unActivo();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar por nombre" }), { target: { value: buscado.nombre } });

    await waitFor(() => expect(listarProductosAdmin).toHaveBeenLastCalledWith({ q: buscado.nombre, categoria: "", estado: "" }));
    await waitFor(() => expect(filas()).toHaveLength(catalogoAdmin({ q: buscado.nombre }).length));
  });

  it("filtra por categoría y por estado", async () => {
    await abrirListado();
    const categoria = CATEGORIAS.find((c) => catalogoAdmin({ categoria: c.id_categoria }).length > 1);

    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: String(categoria.id_categoria) } });
    await waitFor(() => expect(filas()).toHaveLength(catalogoAdmin({ categoria: categoria.id_categoria }).length));

    fireEvent.click(within(screen.getByRole("group", { name: "Estado" })).getByRole("button", { name: "Inactivos" }));
    await waitFor(() =>
      expect(listarProductosAdmin).toHaveBeenLastCalledWith({ q: "", categoria: String(categoria.id_categoria), estado: "inactivo" })
    );
  });

  it("si ningún producto coincide, lo dice", async () => {
    listarProductosAdmin.mockResolvedValue({ ok: true, data: [] });
    conSesion();
    renderApp("/admin/productos");
    await screen.findByText(/aún no hay productos/i);

    fireEvent.click(within(screen.getByRole("group", { name: "Estado" })).getByRole("button", { name: "Inactivos" }));

    expect(await screen.findByText(/ningún producto coincide/i)).toBeInTheDocument();
  });

  it("si la carga falla, muestra el error y permite reintentar", async () => {
    listarProductosAdmin.mockRejectedValueOnce(new ApiError("No se pudo conectar con el servidor."));
    conSesion();
    renderApp("/admin/productos");

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(listarProductosAdmin).toHaveBeenCalledTimes(2);
  });
});

describe("Activar e inactivar (CU-14)", () => {
  it("inactivar pide confirmación y actualiza la fila con la respuesta", async () => {
    await abrirListado();
    const producto = unActivo();

    fireEvent.click(screen.getByRole("button", { name: `Inactivar ${producto.nombre}` }));
    const dialogo = within(screen.getByRole("dialog"));
    expect(dialogo.getByText(/no se elimina/i)).toBeInTheDocument();
    fireEvent.click(dialogo.getByRole("button", { name: "Sí, inactivar" }));

    await waitFor(() => expect(cambiarEstadoProducto).toHaveBeenCalledWith(producto.id_producto, "inactivo"));
    expect(await screen.findByRole("button", { name: `Activar ${producto.nombre}` })).toBeInTheDocument();
    expect(screen.getByText(`${producto.nombre} quedó inactivo.`)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("activar un producto inactivo", async () => {
    await abrirListado();
    const producto = unInactivo();

    fireEvent.click(screen.getByRole("button", { name: `Activar ${producto.nombre}` }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, activar" }));

    await waitFor(() => expect(cambiarEstadoProducto).toHaveBeenCalledWith(producto.id_producto, "activo"));
    expect(await screen.findByRole("button", { name: `Inactivar ${producto.nombre}` })).toBeInTheDocument();
  });

  it("cancelar no llama a la API", async () => {
    await abrirListado();

    fireEvent.click(screen.getByRole("button", { name: `Inactivar ${unActivo().nombre}` }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cambiarEstadoProducto).not.toHaveBeenCalled();
  });
});

describe("Crear (CU-12)", () => {
  const categoria = CATEGORIAS[0];

  function llenarFormulario() {
    escribir("Nombre", "  Casco Urbano LED  ");
    escribir("Categoría", String(categoria.id_categoria));
    escribir("Precio (COP)", "189000");
    escribir("Existencias", "7");
    escribir("Descripción (opcional)", "Con luz trasera");
    elegirImagen(imagen());
  }

  it("el botón 'Nuevo producto' abre el formulario", async () => {
    await abrirListado();

    fireEvent.click(screen.getByRole("link", { name: "Nuevo producto" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Nuevo producto" })).toBeInTheDocument();
  });

  it("valida en el formulario antes de enviar, incluida la imagen obligatoria", async () => {
    await abrirFormulario("/admin/productos/nuevo");

    fireEvent.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(screen.getByText("Escribe el nombre del producto")).toBeInTheDocument();
    expect(screen.getByText("Elige una categoría")).toBeInTheDocument();
    expect(screen.getByText("Escribe el precio")).toBeInTheDocument();
    expect(screen.getByText("Escribe las existencias")).toBeInTheDocument();
    expect(screen.getByText("Elige una imagen del producto")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("aria-invalid", "true");
    expect(crearProducto).not.toHaveBeenCalled();
  });

  it("rechaza una imagen de otro formato o de más de 2 MB", async () => {
    await abrirFormulario("/admin/productos/nuevo");

    elegirImagen(imagen("image/gif"));
    expect(screen.getByText(/formato de imagen no permitido/i)).toBeInTheDocument();

    elegirImagen(imagen("image/png", IMAGEN_MAX_BYTES + 1));
    expect(screen.getByText("La imagen supera el máximo de 2 MB")).toBeInTheDocument();
  });

  it("envía un FormData con los datos limpios y la imagen, y pasa a la edición del producto nuevo (F2.4)", async () => {
    await abrirFormulario("/admin/productos/nuevo");
    llenarFormulario();

    fireEvent.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(crearProducto).toHaveBeenCalledTimes(1));
    expect(crearProducto.mock.calls[0][0]).toBeInstanceOf(FormData);
    const datos = enviados(crearProducto);
    expect(datos).toMatchObject({
      nombre: "Casco Urbano LED",
      id_categoria: String(categoria.id_categoria),
      precio: "189000",
      existencias: "7",
      descripcion: "Con luz trasera",
    });
    expect(datos.imagen).toBeInstanceOf(File);

    // La galería necesita que el producto exista: se sigue en su edición.
    expect(await screen.findByRole("heading", { level: 1, name: "Editar producto" })).toBeInTheDocument();
    expect(screen.getByText(/Se creó Casco Urbano LED\. Ahora puedes agregar más imágenes/)).toBeInTheDocument();
    await waitFor(() => expect(obtenerProductoAdmin).toHaveBeenCalledWith("100"));
  });

  it("PRODUCTO_DUPLICADO se marca en el campo nombre", async () => {
    crearProducto.mockRejectedValueOnce(
      new ApiError("Ya existe un producto con ese nombre en la categoría", { status: 409, code: "PRODUCTO_DUPLICADO" })
    );
    await abrirFormulario("/admin/productos/nuevo");
    llenarFormulario();

    fireEvent.click(screen.getByRole("button", { name: "Crear producto" }));

    const error = await screen.findByText("Ya existe un producto con ese nombre en la categoría");
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("aria-describedby", error.id);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("los demás errores de la API (como una imagen que no es válida) se muestran arriba del formulario", async () => {
    crearProducto.mockRejectedValueOnce(
      new ApiError("El archivo no es una imagen válida de ese tipo", { status: 400 })
    );
    await abrirFormulario("/admin/productos/nuevo");
    llenarFormulario();

    fireEvent.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El archivo no es una imagen válida de ese tipo");
    expect(screen.getByRole("heading", { level: 1, name: "Nuevo producto" })).toBeInTheDocument();
  });
});

describe("Editar (CU-13)", () => {
  const producto = unActivo();
  const ruta = `/admin/productos/${producto.id_producto}`;

  it("carga el producto en el formulario", async () => {
    await abrirFormulario(ruta);

    expect(obtenerProductoAdmin).toHaveBeenCalledWith(String(producto.id_producto));
    expect(screen.getByLabelText("Nombre")).toHaveValue(producto.nombre);
    expect(screen.getByLabelText("Categoría")).toHaveValue(String(producto.id_categoria));
    expect(screen.getByLabelText("Precio (COP)")).toHaveValue(String(producto.precio));
    expect(screen.getByLabelText("Existencias")).toHaveValue(String(producto.existencias));
    expect(screen.getByText(/se conserva la imagen actual/i)).toBeInTheDocument();
  });

  it("el enlace 'Editar' del listado abre el formulario de ese producto", async () => {
    await abrirListado();

    fireEvent.click(screen.getByRole("link", { name: `Editar ${producto.nombre}` }));

    expect(await screen.findByRole("heading", { level: 1, name: "Editar producto" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Nombre")).toHaveValue(producto.nombre);
  });

  it("sin cambiar la imagen: solo envía los campos modificados, sin imagen", async () => {
    await abrirFormulario(ruta);

    escribir("Precio (COP)", String(producto.precio + 1000));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(actualizarProducto).toHaveBeenCalledTimes(1));
    expect(actualizarProducto.mock.calls[0][0]).toBe(producto.id_producto);
    expect(enviados(actualizarProducto)).toEqual({ precio: String(producto.precio + 1000) });
    expect(await screen.findByText(`Se guardaron los cambios de ${producto.nombre}.`)).toBeInTheDocument();
  });

  it("cambiando la imagen: la envía aunque no cambie nada más", async () => {
    await abrirFormulario(ruta);

    elegirImagen(imagen("image/webp"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(actualizarProducto).toHaveBeenCalledTimes(1));
    const datos = enviados(actualizarProducto);
    expect(Object.keys(datos)).toEqual(["imagen"]);
    expect(datos.imagen.type).toBe("image/webp");
  });

  it("si no hay cambios, no llama a la API", async () => {
    await abrirFormulario(ruta);

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("No hiciste cambios.")).toBeInTheDocument();
    expect(actualizarProducto).not.toHaveBeenCalled();
  });

  it("vaciar la descripción la envía vacía para borrarla", async () => {
    const conDescripcion = productoPorId(producto.id_producto);
    await abrirFormulario(ruta);

    expect(screen.getByLabelText("Descripción (opcional)")).toHaveValue(conDescripcion.descripcion);
    escribir("Descripción (opcional)", "   ");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(actualizarProducto).toHaveBeenCalledTimes(1));
    expect(enviados(actualizarProducto)).toEqual({ descripcion: "" });
  });

  it("un producto que no existe muestra el error y un enlace al listado", async () => {
    obtenerProductoAdmin.mockRejectedValueOnce(new ApiError("Producto no encontrado", { status: 404 }));
    conSesion();
    renderApp("/admin/productos/9999");

    expect(await screen.findByRole("alert")).toHaveTextContent("Producto no encontrado");
    expect(within(screen.getByRole("main")).getAllByRole("link", { name: "Volver a productos" })).toHaveLength(2);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
});

describe("Eliminar (F2.4 · decisión M)", () => {
  const producto = unActivo();
  const ruta = `/admin/productos/${producto.id_producto}`;
  const abrirEliminar = async () => {
    await abrirFormulario(ruta);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar producto" }));
    return within(screen.getByRole("dialog"));
  };

  it("pide confirmación, elimina y vuelve al listado", async () => {
    const dialogo = await abrirEliminar();
    expect(dialogo.getByText(/no se puede deshacer/i)).toBeInTheDocument();

    fireEvent.click(dialogo.getByRole("button", { name: "Sí, eliminar" }));

    await waitFor(() => expect(eliminarProducto).toHaveBeenCalledWith(producto.id_producto));
    expect(await screen.findByRole("heading", { level: 1, name: "Productos" })).toBeInTheDocument();
    expect(screen.getByText(`Se eliminó ${producto.nombre}.`)).toBeInTheDocument();
  });

  it("cancelar no llama a la API", async () => {
    const dialogo = await abrirEliminar();

    fireEvent.click(dialogo.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(eliminarProducto).not.toHaveBeenCalled();
  });

  it("si está en un carrito o pedido (PRODUCTO_CON_PEDIDOS), ofrece inactivarlo en su lugar", async () => {
    eliminarProducto.mockRejectedValueOnce(
      new ApiError("No se puede eliminar: el producto está o estuvo en un carrito o pedido.", { status: 409, code: "PRODUCTO_CON_PEDIDOS" })
    );
    const dialogo = await abrirEliminar();
    fireEvent.click(dialogo.getByRole("button", { name: "Sí, eliminar" }));

    const oferta = within(await screen.findByRole("dialog", { name: "No se puede eliminar" }));
    fireEvent.click(oferta.getByRole("button", { name: "Inactivar en su lugar" }));

    await waitFor(() => expect(cambiarEstadoProducto).toHaveBeenCalledWith(producto.id_producto, "inactivo"));
    expect(await screen.findByText(`${producto.nombre} quedó inactivo: ya no se ve en la tienda.`)).toBeInTheDocument();
    expect(screen.getByText("Inactivo", { selector: ".etiqueta" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Editar producto" })).toBeInTheDocument();
  });

  it("si ya estaba inactivo, solo muestra el mensaje de la API", async () => {
    const inactivo = unInactivo();
    eliminarProducto.mockRejectedValueOnce(
      new ApiError("No se puede eliminar: el producto está o estuvo en un carrito o pedido.", { status: 409, code: "PRODUCTO_CON_PEDIDOS" })
    );
    await abrirFormulario(`/admin/productos/${inactivo.id_producto}`);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar producto" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, eliminar" }));

    expect(await screen.findByText(/no se puede eliminar: el producto está o estuvo/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cambiarEstadoProducto).not.toHaveBeenCalled();
  });
});

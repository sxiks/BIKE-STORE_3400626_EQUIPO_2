// F2.2 · Catálogo desde la API (CU-01, CU-02): categorías, orden en la URL, estados y carrito local.
// La API se simula con el catálogo de prueba (productos reales de la semilla): fixtures/catalogo.js.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppRutas } from "../App";
import { listarProductos } from "../services/productos.service";
import { CATEGORIAS, agotado, catalogoPublico, conStockMinimo, masCaroDisponible } from "./fixtures/catalogo";

vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());

// Muestra la URL actual para comprobar que los filtros quedan en ella.
function Ubicacion() {
  const { search } = useLocation();
  return <output data-testid="ubicacion">{search}</output>;
}

function renderTienda(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AppRutas />
      <Ubicacion />
    </MemoryRouter>
  );
}

const tarjetas = () => screen.getAllByTestId(/^producto-\d+$/);
const nombresEnPantalla = () => tarjetas().map((t) => within(t).getByRole("heading").textContent);
const categorias = () => within(screen.getByRole("group", { name: "Categorías" }));
const esperarCatalogo = () => screen.findAllByTestId(/^producto-\d+$/);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // Cada prueba arranca con la API simulada normal (algunas la cambian para su caso).
  listarProductos.mockImplementation((filtros = {}) => Promise.resolve({ ok: true, data: catalogoPublico(filtros) }));
});

describe("Carga desde la API", () => {
  it("muestra los productos activos de la API, con su categoría (sin los inactivos)", async () => {
    renderTienda();
    await esperarCatalogo();

    const activos = catalogoPublico();
    expect(tarjetas()).toHaveLength(activos.length);
    expect(nombresEnPantalla()).toEqual(activos.map((p) => p.nombre));
    const primero = within(screen.getByTestId(`producto-${activos[0].id_producto}`));
    expect(primero.getByText(activos[0].categoria)).toBeInTheDocument();
    expect(screen.getByText(`${activos.length} productos`)).toBeInTheDocument();
    expect(listarProductos).toHaveBeenCalledWith({ categoria: "", orden: "" });
  });

  it("muestra las categorías de la API como filtros, con 'Todas' seleccionada", async () => {
    renderTienda();
    await esperarCatalogo();

    for (const c of CATEGORIAS) expect(categorias().getByRole("button", { name: c.nombre })).toBeInTheDocument();
    expect(categorias().getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");
  });

  it("mientras carga muestra tarjetas vacías", () => {
    listarProductos.mockImplementationOnce(() => new Promise(() => {}));
    renderTienda();

    expect(screen.getByLabelText("Cargando productos")).toHaveAttribute("aria-busy", "true");
  });

  it("si la API falla muestra el error y Reintentar vuelve a pedir", async () => {
    listarProductos.mockImplementationOnce(() => Promise.reject(new Error("No se pudo conectar con el servidor.")));
    renderTienda();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await esperarCatalogo();
    expect(listarProductos).toHaveBeenCalledTimes(2);
  });

  it("una categoría sin productos lo explica", async () => {
    listarProductos.mockImplementation(({ categoria } = {}) =>
      Promise.resolve({ ok: true, data: categoria ? [] : catalogoPublico() })
    );
    renderTienda();
    await esperarCatalogo();

    fireEvent.click(categorias().getByRole("button", { name: CATEGORIAS[0].nombre }));

    expect(await screen.findByText("No hay productos en esta categoría por ahora.")).toBeInTheDocument();
  });
});

describe("Filtros en la URL", () => {
  it("elegir una categoría la pide a la API, la marca y la guarda en la URL", async () => {
    const cascos = CATEGORIAS.find((c) => c.nombre === "Cascos y protección");
    renderTienda();
    await esperarCatalogo();

    fireEvent.click(categorias().getByRole("button", { name: cascos.nombre }));

    await waitFor(() => expect(listarProductos).toHaveBeenLastCalledWith({ categoria: String(cascos.id_categoria), orden: "" }));
    await waitFor(() => expect(nombresEnPantalla()).toEqual(catalogoPublico({ categoria: cascos.id_categoria }).map((p) => p.nombre)));
    expect(screen.getByRole("heading", { level: 2, name: cascos.nombre })).toBeInTheDocument();
    expect(categorias().getByRole("button", { name: cascos.nombre })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("ubicacion")).toHaveTextContent(`?categoria=${cascos.id_categoria}`);
  });

  it("el orden por precio lo pide a la API y queda en la URL", async () => {
    renderTienda();
    await esperarCatalogo();

    fireEvent.change(screen.getByLabelText("Ordenar por"), { target: { value: "precio_asc" } });

    await waitFor(() => expect(nombresEnPantalla()).toEqual(catalogoPublico({ orden: "precio_asc" }).map((p) => p.nombre)));
    expect(listarProductos).toHaveBeenLastCalledWith({ categoria: "", orden: "precio_asc" });
    expect(screen.getByTestId("ubicacion")).toHaveTextContent("?orden=precio_asc");
  });

  it("al abrir un enlace con ?categoria=&orden= se aplican los filtros", async () => {
    const montana = CATEGORIAS[0];
    renderTienda(`/?categoria=${montana.id_categoria}&orden=precio_desc`);
    await esperarCatalogo();

    expect(listarProductos).toHaveBeenCalledWith({ categoria: String(montana.id_categoria), orden: "precio_desc" });
    expect(nombresEnPantalla()).toEqual(catalogoPublico({ categoria: montana.id_categoria, orden: "precio_desc" }).map((p) => p.nombre));
    expect(screen.getByLabelText("Ordenar por")).toHaveValue("precio_desc");
    // Con una categoría elegida no se muestra el destacado
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
  });

  it("valores inválidos en la URL se ignoran", async () => {
    renderTienda("/?categoria=abc&orden=nombre");
    await esperarCatalogo();

    expect(listarProductos).toHaveBeenCalledWith({ categoria: "", orden: "" });
  });
});

describe("Tarjetas", () => {
  it("un producto agotado muestra 'Agotado' y no se puede agregar", async () => {
    const sinStock = agotado();
    renderTienda();
    await esperarCatalogo();

    const tarjeta = within(screen.getByTestId(`producto-${sinStock.id_producto}`));
    expect(tarjeta.getByRole("button", { name: `Agregar ${sinStock.nombre} al carrito` })).toBeDisabled();
    expect(tarjeta.getAllByText("Agotado").length).toBeGreaterThan(0);
  });

  it("si la imagen no carga, muestra la imagen de reemplazo (decisión L)", async () => {
    const [producto] = catalogoPublico();
    renderTienda();
    await esperarCatalogo();

    const imagen = within(screen.getByTestId(`producto-${producto.id_producto}`)).getByRole("img");
    expect(imagen.getAttribute("src")).toContain(`/uploads/productos/${producto.imagen}`);

    fireEvent.error(imagen);

    expect(imagen).toHaveAttribute("data-reemplazo", "si");
    expect(imagen.getAttribute("src")).not.toContain("/uploads/"); // la imagen local (Vite la incluye en el build)
    expect(imagen).toHaveAccessibleName(`${producto.nombre} (imagen no disponible)`);
  });

  it("el destacado es el producto disponible más caro", async () => {
    renderTienda();
    expect(await screen.findByRole("region", { name: masCaroDisponible().nombre })).toBeInTheDocument();
  });
});

describe("Carrito local con los datos de la API (hasta F3.1)", () => {
  it("un producto agregado sigue en el carrito al cambiar de categoría", async () => {
    const [producto] = conStockMinimo(3);
    const otra = CATEGORIAS.find((c) => c.id_categoria !== producto.id_categoria);
    renderTienda();
    await esperarCatalogo();

    fireEvent.click(screen.getByRole("button", { name: `Agregar ${producto.nombre} al carrito` }));
    fireEvent.click(categorias().getByRole("button", { name: otra.nombre }));
    await waitFor(() => expect(screen.queryByTestId(`producto-${producto.id_producto}`)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /abrir carrito/i }));
    expect(within(screen.getByRole("dialog")).getByText(producto.nombre)).toBeInTheDocument();
  });

  it("al cargar el catálogo actualiza el precio y el stock guardados en el carrito", async () => {
    const [producto] = conStockMinimo(3);
    localStorage.setItem(
      "bikestore_carrito",
      JSON.stringify([{ id: producto.id_producto, nombre: producto.nombre, precio: 1, stock: 999, cantidad: 2 }])
    );
    renderTienda();
    await esperarCatalogo();

    await waitFor(() => {
      const guardado = JSON.parse(localStorage.getItem("bikestore_carrito"))[0];
      expect(guardado).toMatchObject({ precio: producto.precio, stock: producto.existencias, cantidad: 2 });
    });
  });

  it("borra el carrito de los datos simulados (clave antigua)", async () => {
    localStorage.setItem("tienda-palmira-carrito", JSON.stringify([{ id: 1, cantidad: 2 }]));
    renderTienda();
    await esperarCatalogo();

    expect(localStorage.getItem("tienda-palmira-carrito")).toBeNull();
  });
});

describe("urlImagen", () => {
  it("arma la URL pública de la imagen y devuelve null sin imagen", async () => {
    const { urlImagen } = await import("../utils/format");
    expect(urlImagen("casco.jpg")).toMatch(/\/uploads\/productos\/casco\.jpg$/);
    expect(urlImagen(null)).toBeNull();
  });
});

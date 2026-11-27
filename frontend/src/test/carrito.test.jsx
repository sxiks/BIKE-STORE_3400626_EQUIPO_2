// Casos de prueba del carrito definidos por el instructor, con los productos reales de la semilla (F2.2).
// Los productos no se escriben a mano: se eligen del catálogo de prueba por lo que cada caso necesita
// (con stock amplio, con poco stock…). Si la semilla cambia o crece, las pruebas se adaptan solas.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import TiendaPage from "../pages/TiendaPage";
import { MSG_MAX } from "../context/CarritoContext";
import { formatoCOP as formatoReal } from "../utils/formato";
import { renderConProveedores } from "./utils";
import { conMasStock, conPocoStock, conStockMinimo } from "./fixtures/catalogo";

vi.mock("../services/productos.service", async () => (await import("./fixtures/catalogo")).servicioSimulado());

// Intl usa un espacio de no separación (U+00A0); jest-dom normaliza el texto
// del elemento a espacio normal, así que normalizamos también el valor esperado.
const formatoCOP = (valor) => formatoReal(valor).replace(/\s/g, " ");

// Productos elegidos por lo que necesita cada caso:
const [A, B, C] = conStockMinimo(3); // tres productos distintos con al menos 3 unidades
const POCO = conPocoStock();         // el de menos unidades (≥ 2): para llegar al tope
const AMPLIO = conMasStock();        // el de más unidades: para corregir un número enorme

const inputCatalogo = (p) => screen.getByLabelText(`Cantidad a agregar de ${p.nombre}`);
const inputCarrito = (p) => screen.getByLabelText(`Cantidad en el carrito de ${p.nombre}`);
const botonAgregar = (p) => screen.getByRole("button", { name: `Agregar ${p.nombre} al carrito` });

const agregar = (p, cantidad) => {
  fireEvent.change(inputCatalogo(p), { target: { value: String(cantidad) } });
  fireEvent.click(botonAgregar(p));
};
const abrirCarrito = () => fireEvent.click(screen.getByRole("button", { name: /abrir carrito/i }));
const cambiar = (input, valor) => fireEvent.change(input, { target: { value: valor } });

// La tienda usa la barra del cliente (Router, Tema, Toasts y Sesión) y carga el catálogo de la API (simulada).
beforeEach(async () => {
  localStorage.clear();
  renderConProveedores(<TiendaPage />);
  await screen.findByTestId(`producto-${A.id_producto}`);
});

describe("Tienda · casos de prueba del carrito (instructor)", () => {
  it("1. Teclear e, E, +, -, . o , no escribe nada (catálogo y carrito)", () => {
    agregar(A, 1);
    abrirCarrito();
    for (const input of [inputCatalogo(A), inputCarrito(A)]) {
      for (const key of ["e", "E", "+", "-", ".", ","]) {
        // fireEvent devuelve false cuando se llamó preventDefault
        expect(fireEvent.keyDown(input, { key })).toBe(false);
      }
      expect(fireEvent.keyDown(input, { key: "5" })).toBe(true);
      expect(fireEvent.keyDown(input, { key: "Backspace" })).toBe(true);
    }
  });

  it("2. Pegar -5, 3e2 o abc no se pega; solo dígitos", () => {
    const input = inputCatalogo(A);
    for (const texto of ["-5", "3e2", "abc"]) {
      expect(fireEvent.paste(input, { clipboardData: { getData: () => texto } })).toBe(false);
    }
    expect(fireEvent.paste(input, { clipboardData: { getData: () => "123" } })).toBe(true);
  });

  it("3. Escribir 0 en la tarjeta conserva el valor y muestra toast de mínimo 1", () => {
    const input = inputCatalogo(A);
    cambiar(input, "0");
    expect(input).toHaveValue(1);
    expect(screen.getByText(/cantidad mínima es 1/i)).toBeInTheDocument();
  });

  it("4. Escribir 0 en el carrito no cambia la cantidad y ofrece eliminar", () => {
    agregar(A, 2);
    abrirCarrito();
    cambiar(inputCarrito(A), "0");
    expect(inputCarrito(A)).toHaveValue(2);
    expect(screen.getByText(/cantidad mínima/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sí, eliminar" })).toBeInTheDocument();
  });

  it(`5. Escribir 999 con stock ${AMPLIO.existencias} corrige a ${AMPLIO.existencias} y muestra el toast de máximo`, () => {
    const input = inputCatalogo(AMPLIO);
    cambiar(input, "999");
    expect(input).toHaveValue(AMPLIO.existencias);
    expect(screen.getByText(MSG_MAX)).toBeInTheDocument();
  });

  it(`6. ${POCO.nombre} (stock ${POCO.existencias}): pasarse del stock al agregar deja el máximo y muestra el toast`, () => {
    agregar(POCO, POCO.existencias - 1);
    agregar(POCO, 2);
    abrirCarrito();
    expect(inputCarrito(POCO)).toHaveValue(POCO.existencias);
    expect(screen.getByText(MSG_MAX)).toBeInTheDocument();
  });

  it("7. En el carrito, + con cantidad igual al stock no sube y muestra el toast", () => {
    agregar(POCO, POCO.existencias);
    abrirCarrito();
    fireEvent.click(screen.getByRole("button", { name: `Aumentar cantidad de ${POCO.nombre}` }));
    expect(inputCarrito(POCO)).toHaveValue(POCO.existencias);
    expect(screen.getByText(MSG_MAX)).toBeInTheDocument();
  });

  it("8. − con cantidad 1 muestra toast de mínimo; al confirmar elimina y recalcula", () => {
    agregar(A, 1);
    agregar(C, 1);
    abrirCarrito();
    expect(screen.getByTestId("total-compra")).toHaveTextContent(formatoCOP(A.precio + C.precio));

    fireEvent.click(screen.getByRole("button", { name: `Disminuir cantidad de ${C.nombre}` }));
    expect(inputCarrito(C)).toHaveValue(1);
    expect(screen.getByText(/cantidad mínima/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    expect(screen.queryByTestId(`linea-${C.id_producto}`)).not.toBeInTheDocument();
    expect(screen.getByTestId("total-compra")).toHaveTextContent(formatoCOP(A.precio));
  });

  it("9. Agregar dos veces el mismo producto deja una sola línea con cantidades sumadas", () => {
    agregar(A, 1);
    agregar(A, 1);
    abrirCarrito();
    const panel = within(screen.getByRole("dialog"));
    expect(panel.getAllByTestId(/^linea-/)).toHaveLength(1);
    expect(inputCarrito(A)).toHaveValue(2);
  });

  it("10. Tres productos con distintas cantidades: subtotales y total correctos", () => {
    agregar(A, 2);
    agregar(B, 3);
    agregar(C, 1);
    abrirCarrito();
    expect(screen.getByTestId(`subtotal-${A.id_producto}`)).toHaveTextContent(formatoCOP(A.precio * 2));
    expect(screen.getByTestId(`subtotal-${B.id_producto}`)).toHaveTextContent(formatoCOP(B.precio * 3));
    expect(screen.getByTestId(`subtotal-${C.id_producto}`)).toHaveTextContent(formatoCOP(C.precio));
    expect(screen.getByTestId("total-compra")).toHaveTextContent(formatoCOP(A.precio * 2 + B.precio * 3 + C.precio));
    expect(screen.getByTestId("total-unidades")).toHaveTextContent("6");
  });

  it(`11. Agregar todo el stock (${POCO.nombre} ×${POCO.existencias}) deshabilita el botón Agregar`, () => {
    expect(botonAgregar(POCO)).toBeEnabled();
    agregar(POCO, POCO.existencias);
    expect(botonAgregar(POCO)).toBeDisabled();
  });

  it("12. El ícono del carrito está a la derecha de la navbar y el contador suma unidades", () => {
    expect(screen.queryByTestId("contador-carrito")).not.toBeInTheDocument();
    agregar(A, 2);
    agregar(B, 3);
    agregar(C, 1);

    const nav = screen.getByRole("navigation");
    const boton = screen.getByRole("button", { name: /abrir carrito/i });
    expect(nav.lastElementChild).toBe(boton);
    expect(nav.firstElementChild).toHaveTextContent("BIKE STORE");
    expect(screen.getByTestId("contador-carrito")).toHaveTextContent("6");
  });
});

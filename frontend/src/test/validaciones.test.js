// F1.3 · Reglas de los formularios de registro y restablecer (CU-09, CU-11, D7).
// F2.3 · Reglas del formulario de productos (CU-12, CU-13), las mismas del backend.
import { describe, expect, it } from "vitest";
import {
  errorEmail,
  passwordValida,
  reglasPassword,
  validarRegistro,
  validarRestablecer,
  validarProducto,
  errorImagen,
  IMAGEN_MAX_BYTES,
  MSG_PASSWORD_D7
} from "../utils/validaciones";

const cumple = (password) =>
  Object.fromEntries(reglasPassword(password).map((regla) => [regla.id, regla.cumple]));

describe("correo", () => {
  it.each(["ana@prueba.local", "  ana.cliente@bike-store.co  ", "a+b@x.io"])("acepta %s", (email) => {
    expect(errorEmail(email)).toBeNull();
  });

  it.each(["", "   "])("pide el correo si está vacío (%j)", (email) => {
    expect(errorEmail(email)).toBe("Escribe tu correo");
  });

  it.each(["ana", "ana@", "ana@prueba", "ana@prueba.c", "ana @prueba.local", "@prueba.local"])(
    "rechaza %s con el mismo criterio del backend",
    (email) => {
      expect(errorEmail(email)).toBe("El correo no tiene un formato válido");
    }
  );

  it("rechaza correos de más de 150 caracteres", () => {
    expect(errorEmail(`${"a".repeat(140)}@prueba.local`)).toBe("El correo no tiene un formato válido");
  });
});

describe("contraseña D7", () => {
  it("evalúa cada regla por separado", () => {
    expect(cumple("")).toEqual({ longitud: false, mayuscula: false, minuscula: false, numero: false });
    expect(cumple("abc")).toEqual({ longitud: false, mayuscula: false, minuscula: true, numero: false });
    expect(cumple("ABCDEFGH")).toEqual({ longitud: true, mayuscula: true, minuscula: false, numero: false });
    expect(cumple("Clave1234")).toEqual({ longitud: true, mayuscula: true, minuscula: true, numero: true });
  });

  it.each([
    ["Clave12", "le falta longitud"],
    ["clave1234", "le falta la mayúscula"],
    ["CLAVE1234", "le falta la minúscula"],
    ["ClaveSegura", "le falta el número"]
  ])("rechaza %s (%s)", (password) => {
    expect(passwordValida(password)).toBe(false);
  });

  it("acepta una contraseña que cumple todo", () => {
    expect(passwordValida("Clave1234")).toBe(true);
  });
});

describe("validarRegistro", () => {
  it("sin errores devuelve un objeto vacío", () => {
    expect(validarRegistro({ nombre: "Ana", email: "ana@prueba.local", password: "Clave1234" })).toEqual({});
  });

  it("devuelve un mensaje por cada campo que falla", () => {
    expect(validarRegistro({ nombre: "  ", email: "ana@", password: "clave" })).toEqual({
      nombre: "Escribe tu nombre",
      email: "El correo no tiene un formato válido",
      password: MSG_PASSWORD_D7
    });
  });

  it("limita el nombre a 100 caracteres, como la API", () => {
    const errores = validarRegistro({ nombre: "a".repeat(101), email: "ana@prueba.local", password: "Clave1234" });
    expect(errores).toEqual({ nombre: "El nombre admite máximo 100 caracteres" });
  });
});

describe("validarRestablecer", () => {
  it("pide que la confirmación coincida", () => {
    expect(validarRestablecer({ password: "Clave1234", confirmacion: "Clave12345" })).toEqual({
      confirmacion: "Las contraseñas no coinciden"
    });
  });

  it("aplica D7 a la contraseña nueva y pide la confirmación", () => {
    expect(validarRestablecer({ password: "corta", confirmacion: "" })).toEqual({
      password: MSG_PASSWORD_D7,
      confirmacion: "Repite la contraseña"
    });
  });

  it("sin errores devuelve un objeto vacío", () => {
    expect(validarRestablecer({ password: "Clave1234", confirmacion: "Clave1234" })).toEqual({});
  });
});

describe("validarProducto", () => {
  const archivo = (tipo, bytes = 10) => new File(["a".repeat(bytes)], "foto", { type: tipo });
  const VALIDO = {
    nombre: "Casco Urbano",
    id_categoria: "4",
    precio: "189000",
    existencias: "5",
    descripcion: "",
    imagen: archivo("image/png"),
  };

  it("un producto completo no tiene errores", () => {
    expect(validarProducto(VALIDO)).toEqual({});
  });

  it("al crear pide todos los campos obligatorios, incluida la imagen", () => {
    expect(Object.keys(validarProducto({}))).toEqual(["nombre", "id_categoria", "precio", "existencias", "imagen"]);
  });

  it("al editar la imagen es opcional", () => {
    expect(validarProducto({ ...VALIDO, imagen: null }, { imagenObligatoria: false })).toEqual({});
  });

  it.each(["0", "-5", "abc", "12,5", "1.234", "100000000"])("rechaza el precio %j", (precio) => {
    expect(validarProducto({ ...VALIDO, precio })).toHaveProperty("precio");
  });

  it.each(["1", "289000", "99.9", "0.01", "99999999.99"])("acepta el precio %j", (precio) => {
    expect(validarProducto({ ...VALIDO, precio })).toEqual({});
  });

  it.each(["-1", "2.5", "x"])("rechaza las existencias %j", (existencias) => {
    expect(validarProducto({ ...VALIDO, existencias })).toHaveProperty("existencias");
  });

  it("acepta 0 existencias (producto agotado)", () => {
    expect(validarProducto({ ...VALIDO, existencias: "0" })).toEqual({});
  });

  it("limita el nombre a 150 caracteres y la descripción a 5000", () => {
    expect(validarProducto({ ...VALIDO, nombre: "a".repeat(151), descripcion: "a".repeat(5001) })).toEqual({
      nombre: "El nombre admite máximo 150 caracteres",
      descripcion: "La descripción admite máximo 5000 caracteres",
    });
  });

  it("solo acepta imágenes JPG, PNG o WEBP de hasta 2 MB", () => {
    expect(errorImagen(archivo("image/jpeg"))).toBeNull();
    expect(errorImagen(archivo("image/webp"))).toBeNull();
    expect(errorImagen(archivo("image/gif"))).toMatch(/formato de imagen no permitido/i);
    expect(errorImagen(archivo("text/html"))).toMatch(/formato de imagen no permitido/i);
    expect(errorImagen(archivo("image/png", IMAGEN_MAX_BYTES + 1))).toBe("La imagen supera el máximo de 2 MB");
  });
});

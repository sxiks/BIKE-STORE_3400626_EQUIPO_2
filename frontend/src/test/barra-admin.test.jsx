// Barra lateral del admin: el menú de pantallas angostas en un equipo lento.
// Antes, el menú se cerraba "al navegar" con un efecto, que también corría al montar la barra. Si el primer
// clic llegaba antes que ese efecto (pasó en el portátil al cargar el panel aparte, H-09), el efecto cerraba
// el menú recién abierto. Esta prueba reproduce ese orden sin depender de la velocidad del equipo.
import { afterEach, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import BarraAdmin from "../components/BarraAdmin";

vi.mock("../hooks/useAuth", () => ({ useAuth: () => ({ user: { nombre: "Admin Tienda", rol: "admin" }, logout: () => {} }) }));
vi.mock("../context/ToastContext", () => ({ useToast: () => ({ mostrar: () => {} }) }));
vi.mock("../components/BotonTema", () => ({ default: () => null }));

let raiz;
let contenedor;

afterEach(() => {
  raiz?.unmount();
  contenedor?.remove();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

it("un clic en 'Abrir menú' apenas aparece la barra, antes de que React corra los efectos, abre el menú", async () => {
  // Como en el navegador: React corre los efectos en una tarea aparte, después de escribir el DOM.
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  contenedor = document.body.appendChild(document.createElement("div"));
  const estado = new Promise((resolve) => {
    // El observador se ejecuta apenas React escribe la barra, antes de la tarea de los efectos.
    const observador = new MutationObserver(() => {
      const boton = contenedor.querySelector("button[aria-controls]");
      if (!boton) return;
      observador.disconnect();
      boton.click();
      setTimeout(() => resolve(contenedor.querySelector("button[aria-controls]").getAttribute("aria-expanded")), 50);
    });
    observador.observe(contenedor, { childList: true, subtree: true });
  });

  raiz = createRoot(contenedor);
  raiz.render(
    <MemoryRouter initialEntries={["/admin"]}>
      <BarraAdmin />
    </MemoryRouter>
  );

  expect(await estado).toBe("true");
});

import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Cuánto esperan findBy* y waitFor antes de fallar (por defecto, 1 segundo). El tablero se carga aparte
// (React.lazy, con recharts) y la primera vez se compila durante la prueba: con las 19 suites en paralelo
// tarda casi 1 s en el PC de la casa y casi 2 s en el portátil, donde la prueba fallaba sin que hubiera
// ningún error. 5 s cubre los equipos lentos; una prueba que pasa no espera de más, solo la que falla.
configure({ asyncUtilTimeout: 5000 });

// Ninguna prueba puede salir a la red. Cada archivo simula fetch con vi.stubGlobal y lo restaura con
// vi.unstubAllGlobals(), que devuelve el fetch que había antes de simularlo. Si ese fuera el fetch real,
// una petición que quede pendiente al terminar una prueba (por ejemplo, la carga del carrito después de
// GET /auth/me) llegaría a la API de desarrollo si está encendida; su 401 cerraría la sesión de la prueba
// siguiente y la haría fallar al azar. Con este reemplazo, esa petición falla como "sin conexión" (status 0),
// que no cierra ninguna sesión.
globalThis.fetch = () => Promise.reject(new TypeError("Las pruebas no salen a la red: simula fetch o el servicio"));

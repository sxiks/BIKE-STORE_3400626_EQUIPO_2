import "@testing-library/jest-dom/vitest";

// Ninguna prueba puede salir a la red. Cada archivo simula fetch con vi.stubGlobal y lo restaura con
// vi.unstubAllGlobals(), que devuelve el fetch que había antes de simularlo. Si ese fuera el fetch real,
// una petición que quede pendiente al terminar una prueba (por ejemplo, la carga del carrito después de
// GET /auth/me) llegaría a la API de desarrollo si está encendida; su 401 cerraría la sesión de la prueba
// siguiente y la haría fallar al azar. Con este reemplazo, esa petición falla como "sin conexión" (status 0),
// que no cierra ninguna sesión.
globalThis.fetch = () => Promise.reject(new TypeError("Las pruebas no salen a la red: simula fetch o el servicio"));

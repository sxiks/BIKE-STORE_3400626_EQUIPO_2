// Guarda un archivo que llegó de la API (F4.2): crea una URL temporal para el blob, la "hace clic" con un
// enlace con atributo download y la libera. Hace falta porque la petición lleva el token Bearer:
// un <a href> normal no podría enviarlo.
export function guardarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

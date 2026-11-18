// Error de negocio. `code` es opcional y le permite al frontend reaccionar sin comparar textos
// (ej. 'CANTIDAD_MINIMA' -> ofrecer eliminar el producto del carrito).
class AppError extends Error {
  constructor(message, status = 500, code = undefined, data = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

module.exports = AppError;

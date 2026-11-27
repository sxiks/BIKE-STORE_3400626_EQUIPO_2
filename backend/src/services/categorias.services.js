// Capa de Negocio: gestión de categorías del administrador (B2.2, decisión M).
// La lista pública (GET /categorias) sigue en productos.services.listarCategorias.
const categoriasRepository = require('../repositories/categorias.repository');
const AppError = require('../utils/AppError');
const v = require('../utils/validators');

const NOMBRE_MAX = 100; // categorias.nombre es VARCHAR(100)
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

function errorDuplicada(error) {
  if (error.code === UNIQUE_VIOLATION) {
    return new AppError('Ya existe una categoría con ese nombre', 409, 'CATEGORIA_DUPLICADA');
  }
  return error;
}

function errorConProductos(total) {
  return new AppError(
    total === 1
      ? 'No se puede eliminar: la categoría tiene 1 producto. Muévelo a otra categoría primero'
      : `No se puede eliminar: la categoría tiene ${total} productos. Muévelos a otra categoría primero`,
    409,
    'CATEGORIA_CON_PRODUCTOS',
    { total_productos: total }
  );
}

async function obtener(idCategoria) {
  const categoria = await categoriasRepository.findByIdAdmin(v.id(idCategoria));
  if (!categoria) throw new AppError('Categoría no encontrada', 404);
  return categoria;
}

async function listarAdmin() {
  return categoriasRepository.findAllAdmin();
}

async function crear({ nombre } = {}) {
  const limpio = v.textoObligatorio(nombre, 'nombre', NOMBRE_MAX);
  try {
    const id = await categoriasRepository.create(limpio);
    return categoriasRepository.findByIdAdmin(id);
  } catch (error) {
    throw errorDuplicada(error);
  }
}

async function renombrar(idCategoria, { nombre } = {}) {
  const id = v.id(idCategoria);
  const limpio = v.textoObligatorio(nombre, 'nombre', NOMBRE_MAX);
  try {
    if (!(await categoriasRepository.update(id, limpio))) throw new AppError('Categoría no encontrada', 404);
    return categoriasRepository.findByIdAdmin(id);
  } catch (error) {
    throw errorDuplicada(error);
  }
}

// Solo sin productos, ni activos ni inactivos (decisión M). La llave foránea (ON DELETE RESTRICT)
// también lo impide: si alguien crea un producto justo antes del DELETE, el 23503 se responde igual.
async function eliminar(idCategoria) {
  const categoria = await obtener(idCategoria);
  if (categoria.total_productos > 0) throw errorConProductos(categoria.total_productos);
  try {
    await categoriasRepository.remove(categoria.id_categoria);
  } catch (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      throw errorConProductos((await obtener(categoria.id_categoria)).total_productos);
    }
    throw error;
  }
  return { id_categoria: categoria.id_categoria };
}

module.exports = { listarAdmin, crear, renombrar, eliminar };

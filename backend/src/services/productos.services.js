// Capa de Negocio: categorías, catálogo y administración de productos (CU-01, CU-02, CU-12 a CU-15).
const fs = require('fs/promises');
const path = require('path');
const categoriasRepository = require('../repositories/categorias.repository');
const productosRepository = require('../repositories/productos.repository');
const AppError = require('../utils/AppError');
const v = require('../utils/validators');
const { UPLOAD_DIRS } = require('../config/uploads');

const ESTADOS = ['activo', 'inactivo'];
const ORDENES = ['precio_asc', 'precio_desc'];
const UNIQUE_VIOLATION = '23505';

async function borrarImagen(nombre) {
  if (!nombre) return;
  try {
    await fs.unlink(path.join(UPLOAD_DIRS.productos, nombre));
  } catch {
    // Si el archivo no existe en disco (ej. imágenes de la semilla) no es un error.
  }
}

function errorDuplicado(error) {
  if (error.code === UNIQUE_VIOLATION) {
    return new AppError('Ya existe un producto con ese nombre en la categoría', 409, 'PRODUCTO_DUPLICADO');
  }
  return error;
}

async function validarCategoria(idCategoria) {
  const id = v.id(idCategoria, 'id_categoria');
  if (!(await categoriasRepository.findById(id))) {
    throw new AppError('La categoría no existe', 400);
  }
  return id;
}

async function listarCategorias() {
  return categoriasRepository.findAll();
}

async function listarCatalogo({ categoria, orden } = {}) {
  return productosRepository.listarCatalogo({
    idCategoria: categoria ? v.id(categoria, 'categoria') : null,
    orden: orden ? v.enLista(orden, ORDENES, 'orden') : null
  });
}

// Público: un producto inactivo no se muestra (404).
async function obtenerPublico(idProducto) {
  const producto = await productosRepository.findById(v.id(idProducto));
  if (!producto || producto.estado !== 'activo') throw new AppError('Producto no encontrado', 404);
  return producto;
}

async function listarAdmin({ q, categoria, estado } = {}) {
  return productosRepository.listarAdmin({
    q: v.textoOpcional(q, 'q', 150),
    idCategoria: categoria ? v.id(categoria, 'categoria') : null,
    estado: estado ? v.enLista(estado, ESTADOS, 'estado') : null
  });
}

async function obtenerAdmin(idProducto) {
  const producto = await productosRepository.findById(v.id(idProducto));
  if (!producto) throw new AppError('Producto no encontrado', 404);
  return producto;
}

// CU-12: todos los datos obligatorios, incluida la imagen.
async function crear(datos = {}, imagen) {
  try {
    if (!imagen) throw new AppError('La imagen del producto es obligatoria', 400);
    const producto = {
      idCategoria: await validarCategoria(datos.id_categoria),
      nombre: v.textoObligatorio(datos.nombre, 'nombre', 150),
      descripcion: v.textoOpcional(datos.descripcion, 'descripcion', 5000),
      precio: v.precio(datos.precio),
      existencias: v.entero(datos.existencias, 'existencias', 0),
      imagen
    };
    const id = await productosRepository.create(producto);
    return productosRepository.findById(id);
  } catch (error) {
    await borrarImagen(imagen); // no dejar archivos huérfanos si falla
    throw errorDuplicado(error);
  }
}

// CU-13: actualización parcial; lo que no llega conserva su valor actual.
async function actualizar(idProducto, datos = {}, imagenNueva) {
  try {
    const actual = await obtenerAdmin(idProducto);
    const tiene = (campo) => datos[campo] !== undefined && datos[campo] !== '';
    const cambios = {
      idCategoria: tiene('id_categoria') ? await validarCategoria(datos.id_categoria) : actual.id_categoria,
      nombre: tiene('nombre') ? v.textoObligatorio(datos.nombre, 'nombre', 150) : actual.nombre,
      descripcion:
        datos.descripcion !== undefined
          ? v.textoOpcional(datos.descripcion, 'descripcion', 5000)
          : actual.descripcion,
      precio: tiene('precio') ? v.precio(datos.precio) : actual.precio,
      existencias: tiene('existencias') ? v.entero(datos.existencias, 'existencias', 0) : actual.existencias,
      imagen: imagenNueva || actual.imagen
    };
    await productosRepository.update(actual.id_producto, cambios);
    if (imagenNueva && actual.imagen !== imagenNueva) await borrarImagen(actual.imagen);
    return productosRepository.findById(actual.id_producto);
  } catch (error) {
    await borrarImagen(imagenNueva);
    throw errorDuplicado(error);
  }
}

// CU-14: borrado lógico (nunca DELETE).
async function cambiarEstado(idProducto, { estado } = {}) {
  v.enLista(estado, ESTADOS, 'estado');
  const afectados = await productosRepository.updateEstado(v.id(idProducto), estado);
  if (!afectados) throw new AppError('Producto no encontrado', 404);
  return productosRepository.findById(Number(idProducto));
}

module.exports = {
  listarCategorias,
  listarCatalogo,
  obtenerPublico,
  listarAdmin,
  obtenerAdmin,
  crear,
  actualizar,
  cambiarEstado
};

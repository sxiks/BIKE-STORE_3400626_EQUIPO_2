// Capa de Negocio: categorías, catálogo y administración de productos (CU-01, CU-02, CU-12 a CU-15),
// más la eliminación de productos nunca usados y la galería de imágenes (B2.2, decisión M).
const fs = require('fs/promises');
const path = require('path');
const categoriasRepository = require('../repositories/categorias.repository');
const productosRepository = require('../repositories/productos.repository');
const productoImagenesRepository = require('../repositories/productoImagenes.repository');
const { withTransaction } = require('../repositories/transaction');
const AppError = require('../utils/AppError');
const v = require('../utils/validators');
const { UPLOAD_DIRS } = require('../config/uploads');

const ESTADOS = ['activo', 'inactivo'];
const ORDENES = ['precio_asc', 'precio_desc'];
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const MAX_IMAGENES = 5; // portada + 4 en la galería (decisión M)

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

// Producto con su galería (ProductoDetalle en API_CONTRATOS.md).
async function conImagenes(producto) {
  return { ...producto, imagenes: await productoImagenesRepository.listarPorProducto(producto.id_producto) };
}

// Público: un producto inactivo no se muestra (404).
async function obtenerPublico(idProducto) {
  const producto = await productosRepository.findById(v.id(idProducto));
  if (!producto || producto.estado !== 'activo') throw new AppError('Producto no encontrado', 404);
  return conImagenes(producto);
}

async function listarAdmin({ q, categoria, estado } = {}) {
  return productosRepository.listarAdmin({
    q: v.textoOpcional(q, 'q', 150),
    idCategoria: categoria ? v.id(categoria, 'categoria') : null,
    estado: estado ? v.enLista(estado, ESTADOS, 'estado') : null
  });
}

async function buscarAdmin(idProducto) {
  const producto = await productosRepository.findById(v.id(idProducto));
  if (!producto) throw new AppError('Producto no encontrado', 404);
  return producto;
}

async function obtenerAdmin(idProducto) {
  return conImagenes(await buscarAdmin(idProducto));
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
    const actual = await buscarAdmin(idProducto);
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

// CU-14: borrado lógico (nunca DELETE). CU-14 2.1: si ya está en ese estado, se informa (409 SIN_CAMBIOS).
async function cambiarEstado(idProducto, { estado } = {}) {
  v.enLista(estado, ESTADOS, 'estado');
  const actual = await buscarAdmin(idProducto);
  if (actual.estado === estado) {
    throw new AppError(`El producto ya se encuentra ${estado}`, 409, 'SIN_CAMBIOS');
  }
  await productosRepository.updateEstado(actual.id_producto, estado);
  return productosRepository.findById(actual.id_producto);
}

// ---------- B2.2: eliminar y galería ----------

const errorNoEncontrado = () => new AppError('Producto no encontrado', 404);
const errorImagenNoEncontrada = () => new AppError('Imagen no encontrada', 404);
const errorConPedidos = () =>
  new AppError(
    'No se puede eliminar: el producto está o estuvo en un carrito o pedido. Inactívalo en su lugar',
    409,
    'PRODUCTO_CON_PEDIDOS'
  );

// Solo si nunca estuvo en un carrito ni en un pedido (decisión M). El producto se bloquea antes de revisar:
// nadie puede agregarlo a un carrito mientras tanto. Los archivos se borran después del COMMIT,
// para no perder imágenes si la transacción se deshace.
async function eliminar(idProducto) {
  const id = v.id(idProducto);
  let archivos;
  try {
    archivos = await withTransaction(async (tx) => {
      const producto = await productosRepository.bloquear(id, tx);
      if (!producto) throw errorNoEncontrado();
      if (await productosRepository.usadoEnPedidos(id, tx)) throw errorConPedidos();
      const galeria = await productoImagenesRepository.listarPorProducto(id, tx);
      await productosRepository.remove(id, tx); // la galería se borra en cascada
      return [producto.imagen, ...galeria.map((img) => img.imagen)];
    });
  } catch (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) throw errorConPedidos();
    throw error;
  }
  await Promise.all(archivos.map(borrarImagen));
  return { id_producto: id };
}

// Agrega una imagen al final de la galería. Si algo falla, el archivo subido se borra.
async function agregarImagen(idProducto, imagen) {
  try {
    if (!imagen) throw new AppError('La imagen es obligatoria', 400);
    const id = v.id(idProducto);
    await withTransaction(async (tx) => {
      // El bloqueo evita que dos subidas al mismo tiempo pasen juntas el límite.
      if (!(await productosRepository.bloquear(id, tx))) throw errorNoEncontrado();
      const galeria = await productoImagenesRepository.listarPorProducto(id, tx);
      if (galeria.length + 1 >= MAX_IMAGENES) {
        throw new AppError(
          `El producto ya tiene el máximo de ${MAX_IMAGENES} imágenes (portada y ${MAX_IMAGENES - 1} más)`,
          409,
          'LIMITE_IMAGENES',
          { maximo: MAX_IMAGENES }
        );
      }
      await productoImagenesRepository.create(id, imagen, tx);
    });
    return obtenerAdmin(id);
  } catch (error) {
    await borrarImagen(imagen);
    throw error;
  }
}

async function quitarImagen(idProducto, idImagen) {
  const id = v.id(idProducto);
  const archivo = await withTransaction(async (tx) => {
    if (!(await productosRepository.bloquear(id, tx))) throw errorNoEncontrado();
    const img = await productoImagenesRepository.findDeProducto(id, v.id(idImagen, 'idImagen'), tx);
    if (!img) throw errorImagenNoEncontrada();
    await productoImagenesRepository.remove(img.id_imagen, tx);
    return img.imagen;
  });
  await borrarImagen(archivo);
  return obtenerAdmin(id);
}

// Intercambio: la imagen elegida pasa a ser la portada y la portada anterior toma su lugar en la galería.
async function elegirPortada(idProducto, idImagen) {
  const id = v.id(idProducto);
  await withTransaction(async (tx) => {
    const producto = await productosRepository.bloquear(id, tx);
    if (!producto) throw errorNoEncontrado();
    const img = await productoImagenesRepository.findDeProducto(id, v.id(idImagen, 'idImagen'), tx);
    if (!img) throw errorImagenNoEncontrada();
    await productosRepository.updateImagen(id, img.imagen, tx);
    await productoImagenesRepository.cambiarArchivo(img.id_imagen, producto.imagen, tx);
  });
  return obtenerAdmin(id);
}

// ids: todos los id_imagen de la galería, cada uno una vez, en el orden nuevo.
async function reordenarImagenes(idProducto, { ids } = {}) {
  const id = v.id(idProducto);
  const errorIds = () =>
    new AppError('Envía en "ids" todas las imágenes de la galería, cada una una sola vez, en el orden nuevo', 400);
  if (!Array.isArray(ids)) throw errorIds();
  const nuevos = ids.map((x) => v.id(x, 'ids'));

  await withTransaction(async (tx) => {
    if (!(await productosRepository.bloquear(id, tx))) throw errorNoEncontrado();
    const actuales = (await productoImagenesRepository.listarPorProducto(id, tx)).map((img) => img.id_imagen);
    const mismos =
      nuevos.length === actuales.length &&
      new Set(nuevos).size === nuevos.length &&
      nuevos.every((x) => actuales.includes(x));
    if (!mismos) throw errorIds();
    await productoImagenesRepository.reordenar(id, nuevos, tx);
  });
  return obtenerAdmin(id);
}

module.exports = {
  listarCategorias,
  listarCatalogo,
  obtenerPublico,
  listarAdmin,
  obtenerAdmin,
  crear,
  actualizar,
  cambiarEstado,
  eliminar,
  agregarImagen,
  quitarImagen,
  elegirPortada,
  reordenarImagenes
};

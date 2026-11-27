// Subida de imágenes con multer. Solo jpg, png o webp de hasta 2 MB.
// Seguridad (B2.1):
//  - La extensión del archivo guardado sale del tipo de imagen permitido, nunca del nombre original
//    (antes, "pagina.html" enviado como image/png se guardaba como .html y /uploads lo servía como página web).
//  - Después de guardar, se revisan los primeros bytes del archivo ("firma"): si no corresponden al tipo
//    declarado, el archivo se borra y se responde 400. El Content-Type lo escribe el cliente; los bytes no mienten.
const fs = require('fs/promises');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { UPLOAD_DIRS } = require('../config/uploads');

const MAX_SIZE = 2 * 1024 * 1024;

// Tipo permitido → extensión con la que se guarda.
const EXTENSIONES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

// Firma de cada tipo: lo que debe haber al inicio del archivo.
const FIRMAS = {
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
};

const MSG_FORMATO = 'Formato de imagen no permitido (solo jpg, png o webp)';
const MSG_CONTENIDO = 'El archivo no es una imagen válida (solo jpg, png o webp)';

async function leerInicio(ruta, bytes = 12) {
  const archivo = await fs.open(ruta, 'r');
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await archivo.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await archivo.close();
  }
}

function crearUploadImagen(carpeta) {
  const destino = UPLOAD_DIRS[carpeta];
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destino),
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${EXTENSIONES[file.mimetype]}`);
    }
  });

  function fileFilter(req, file, cb) {
    if (!EXTENSIONES[file.mimetype]) {
      return cb(new AppError(MSG_FORMATO, 400));
    }
    cb(null, true);
  }

  const subir = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } }).single('imagen');

  // Sube con multer y, si llegó un archivo, verifica su firma antes de seguir.
  return function uploadImagen(req, res, next) {
    subir(req, res, async (error) => {
      if (error) return next(error);
      if (!req.file) return next();
      try {
        const inicio = await leerInicio(req.file.path);
        if (!FIRMAS[req.file.mimetype](inicio)) {
          await fs.unlink(req.file.path).catch(() => {});
          return next(new AppError(MSG_CONTENIDO, 400));
        }
        next();
      } catch (errorLectura) {
        await fs.unlink(req.file.path).catch(() => {});
        next(errorLectura);
      }
    });
  };
}

module.exports = { uploadProductoImagen: crearUploadImagen('productos') };

// Subida de imágenes con multer. Solo jpg, png o webp de hasta 2 MB.
const path = require('path');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { UPLOAD_DIRS } = require('../config/uploads');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024;

function crearUploadImagen(carpeta) {
  const destino = UPLOAD_DIRS[carpeta];
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destino),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  });

  function fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new AppError('Formato de imagen no permitido (solo jpg, png o webp)', 400));
    }
    cb(null, true);
  }

  return multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } }).single('imagen');
}

module.exports = { uploadProductoImagen: crearUploadImagen('productos') };

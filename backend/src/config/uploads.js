// Rutas de las carpetas de imágenes. Se crean al arrancar si no existen.
const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

const UPLOAD_DIRS = {
  productos: path.join(UPLOAD_ROOT, 'productos')
};

for (const dir of Object.values(UPLOAD_DIRS)) {
  fs.mkdirSync(dir, { recursive: true });
}

module.exports = { UPLOAD_ROOT, UPLOAD_DIRS };

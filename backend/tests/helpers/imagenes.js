// Archivos de prueba para la subida de imágenes, generados en memoria (sin binarios en el repositorio).
const fs = require('fs');
const { UPLOAD_DIRS } = require('../../src/config/uploads');

// PNG válido de 1×1 píxel.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

// JPEG mínimo: solo importan sus primeros bytes (FF D8 FF), que es lo que se verifica.
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60, 0)]);

// WebP mínimo: "RIFF" + tamaño + "WEBP".
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x1a, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(20, 0)]);

// Texto y HTML: no son imágenes aunque se envíen como image/png.
const TEXTO = Buffer.from('esto no es una imagen');
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>');

// Un byte más que el máximo permitido (2 MB), con cabecera PNG.
const PNG_GRANDE = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024 + 1 - PNG.length, 0)]);

// Nombres de los archivos que hay hoy en uploads/productos (para detectar huérfanos).
function archivosEnUploads() {
  return fs.readdirSync(UPLOAD_DIRS.productos).sort();
}

function existeEnUploads(nombre) {
  return fs.existsSync(`${UPLOAD_DIRS.productos}/${nombre}`);
}

// Borra de uploads/productos los archivos que no estaban en la lista `antes`.
function borrarNuevos(antes) {
  for (const nombre of archivosEnUploads()) {
    if (!antes.includes(nombre)) fs.unlinkSync(`${UPLOAD_DIRS.productos}/${nombre}`);
  }
}

module.exports = { PNG, JPEG, WEBP, TEXTO, HTML, PNG_GRANDE, archivosEnUploads, existeEnUploads, borrarNuevos };

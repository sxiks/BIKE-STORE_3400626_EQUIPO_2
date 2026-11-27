const express = require('express');
const controller = require('../controllers/productos.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { uploadProductoImagen } = require('../middlewares/upload.middleware');

const router = express.Router();
const soloAdmin = [authenticate, authorize('admin')];

// Administración (CU-12 a CU-15). Van ANTES de '/:id' para que 'admin' no se lea como id.
router.get('/admin', soloAdmin, controller.listarAdmin);
router.get('/admin/:id', soloAdmin, controller.obtenerAdmin);
router.post('/', soloAdmin, uploadProductoImagen, controller.crear);
router.put('/:id', soloAdmin, uploadProductoImagen, controller.actualizar);
router.patch('/:id/estado', soloAdmin, controller.cambiarEstado);

// Eliminar productos nunca usados y galería de imágenes (B2.2, decisión M).
// '/imagenes/orden' va antes de '/imagenes/:idImagen' para que 'orden' no se lea como id.
router.delete('/:id', soloAdmin, controller.eliminar);
router.post('/:id/imagenes', soloAdmin, uploadProductoImagen, controller.agregarImagen);
router.patch('/:id/imagenes/orden', soloAdmin, controller.reordenarImagenes);
router.delete('/:id/imagenes/:idImagen', soloAdmin, controller.quitarImagen);
router.patch('/:id/imagenes/:idImagen/portada', soloAdmin, controller.elegirPortada);

// Catálogo público (CU-01, CU-02): solo productos activos.
router.get('/', controller.listarCatalogo);
router.get('/:id', controller.obtenerPublico);

module.exports = router;

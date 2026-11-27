const express = require('express');
const controller = require('../controllers/productos.controller');
const categorias = require('../controllers/categorias.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();
const soloAdmin = [authenticate, authorize('admin')];

router.get('/', controller.listarCategorias); // CU-02 (público)

// Gestión de categorías (B2.2, decisión M). '/admin' va antes de '/:id' para que no se lea como id.
router.get('/admin', soloAdmin, categorias.listarAdmin);
router.post('/', soloAdmin, categorias.crear);
router.put('/:id', soloAdmin, categorias.renombrar);
router.delete('/:id', soloAdmin, categorias.eliminar);

module.exports = router;

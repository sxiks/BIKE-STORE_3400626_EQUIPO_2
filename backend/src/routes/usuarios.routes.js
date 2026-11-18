const express = require('express');
const controller = require('../controllers/usuarios.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', controller.listar);                  // CU-19
router.patch('/:id/rol', controller.cambiarRol);     // CU-20 (D5)
router.patch('/:id/estado', controller.cambiarEstado); // CU-21 (D6)

module.exports = router;

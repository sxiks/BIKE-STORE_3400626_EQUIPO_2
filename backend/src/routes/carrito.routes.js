const express = require('express');
const controller = require('../controllers/carrito.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// D1: el carrito exige sesión. K: solo para clientes.
router.use(authenticate, authorize('cliente'));

router.get('/', controller.obtener);                              // CU-04, CU-06, CU-07
router.post('/items', controller.agregar);                        // CU-03
router.put('/items/:idProducto', controller.actualizarCantidad);  // CU-05
router.delete('/items/:idProducto', controller.eliminar);         // CU-05

module.exports = router;

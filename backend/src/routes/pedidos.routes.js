const express = require('express');
const controller = require('../controllers/pedidos.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('cliente'), controller.crear);           // CU-07 / CU-08
router.get('/', authorize('cliente'), controller.listarMios);
router.post('/:id/pagos', authorize('cliente'), controller.pagar);  // CU-08
router.get('/:numero', controller.obtener);                         // dueño o admin

module.exports = router;

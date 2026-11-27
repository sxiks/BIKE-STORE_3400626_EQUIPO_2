const express = require('express');
const controller = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/metricas', controller.metricas); // CU-16, CU-17
router.get('/alertas', controller.alertas);   // CU-16
router.get('/exportar', controller.exportar); // CU-18 (decisión D11)

module.exports = router;

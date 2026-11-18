const express = require('express');
const controller = require('../controllers/productos.controller');

const router = express.Router();

router.get('/', controller.listarCategorias); // CU-02 (público)

module.exports = router;

const express = require('express');
const controller = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const limite = require('../middlewares/limite.middleware');

const router = express.Router();

// Límite de intentos (B1): por IP en las tres rutas públicas y, además, por correo en login y recuperar.
router.post('/register', limite.porIp, controller.register);                            // CU-09
router.post('/login', limite.porIp, limite.loginPorCorreo, controller.login);           // CU-10
router.post('/recuperar', limite.porIp, limite.recuperarPorCorreo, controller.recuperar); // CU-11 (solicitar token)
router.post('/restablecer', controller.restablecer); // CU-11 (usar token)
router.get('/me', authenticate, controller.me);    // CU-22

module.exports = router;

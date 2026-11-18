const express = require('express');
const controller = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', controller.register);     // CU-09
router.post('/login', controller.login);           // CU-10
router.post('/recuperar', controller.recuperar);   // CU-11 (solicitar token)
router.post('/restablecer', controller.restablecer); // CU-11 (usar token)
router.get('/me', authenticate, controller.me);    // CU-22

module.exports = router;

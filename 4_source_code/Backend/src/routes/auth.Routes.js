const express = require('express');
const router = express.Router();
const { register, login, getMe, logout } = require('../controllers/auth.Controller');
const authMiddleware = require('../middlewares/auth.Middleware');
const validate = require('../middlewares/validate.Middleware');
const { registerSchema, loginSchema } = require('../services/validators');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);

module.exports = router;

module.exports = router;
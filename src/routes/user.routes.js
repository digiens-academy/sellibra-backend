const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const validators = require('../utils/validators');

// All routes are protected
router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, validators.updateProfile, userController.updateProfile);
router.get('/printnest-sessions', protect, userController.getPrintNestSessions);
router.get('/tokens', protect, userController.getTokens);

module.exports = router;


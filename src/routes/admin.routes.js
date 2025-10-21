const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');
const validators = require('../utils/validators');

// All routes are protected and admin only
router.use(protect, adminOnly);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', validators.userId, adminController.getUserById);
router.put('/users/:id/confirm-printnest', validators.userId, adminController.confirmPrintNest);
router.put('/users/:id/role', validators.userId, adminController.updateUserRole);
router.put('/users/:id/tokens', validators.userId, adminController.updateUserTokens);
router.post('/users/:id/reset-tokens', validators.userId, adminController.resetUserTokens);
router.delete('/users/:id', validators.userId, adminController.deleteUser);

// PrintNest sessions
router.get('/printnest-sessions', adminController.getPrintNestSessions);

// Stats
router.get('/stats', adminController.getStats);

// Google Sheets sync
router.post('/sync-to-sheets', adminController.syncToSheets);
router.get('/sync-logs', adminController.getSyncLogs);

module.exports = router;


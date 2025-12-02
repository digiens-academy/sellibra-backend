const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, adminOnly, adminOrSupport } = require('../middlewares/auth.middleware');
const validators = require('../utils/validators');

// Public webhook endpoint (protected with secret token in controller)
// This must be BEFORE the middleware below
router.post('/sheets-webhook', adminController.handleSheetsWebhook);

// Protected routes - accessible by both admin and support (read-only for support)
router.get('/users', protect, adminOrSupport, adminController.getUsers);
router.get('/users/:id', protect, adminOrSupport, validators.userId, adminController.getUserById);
router.get('/stats', protect, adminOrSupport, adminController.getStats);
router.get('/settings', protect, adminOrSupport, adminController.getSettings);
router.get('/printnest-sessions', protect, adminOrSupport, adminController.getPrintNestSessions);
router.get('/sync-logs', protect, adminOrSupport, adminController.getSyncLogs);

// Admin-only routes (write operations)
router.put('/users/:id/confirm-printnest', protect, adminOnly, validators.userId, adminController.confirmPrintNest);
router.put('/users/:id/role', protect, adminOnly, validators.userId, adminController.updateUserRole);
router.put('/users/:id/tokens', protect, adminOnly, validators.userId, adminController.updateUserTokens);
router.post('/users/:id/reset-tokens', protect, adminOnly, validators.userId, adminController.resetUserTokens);
router.delete('/users/:id', protect, adminOnly, validators.userId, adminController.deleteUser);

// Google Sheets sync - admin only
router.post('/sync-to-sheets', protect, adminOnly, adminController.syncToSheets);
router.post('/import-from-sheets', protect, adminOnly, adminController.importFromSheets);

// System settings update - admin only
router.put('/settings', protect, adminOnly, adminController.updateSetting);

module.exports = router;


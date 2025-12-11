const express = require('express');
const router = express.Router();
const etsyOAuthController = require('../controllers/etsyOAuth.controller');
const { protect } = require('../middlewares/auth.middleware');

// All routes except callback require authentication
router.use((req, res, next) => {
  // Skip auth for callback route (Etsy redirects here)
  if (req.path === '/callback') {
    return next();
  }
  return protect(req, res, next);
});

// @route   GET /api/etsy-oauth/connect
// @desc    Initiate OAuth connection
// @access  Private
router.get('/connect', etsyOAuthController.initiateConnection);

// @route   GET /api/etsy-oauth/callback
// @desc    Handle OAuth callback from Etsy
// @access  Public (no auth, Etsy redirects here)
router.get('/callback', etsyOAuthController.handleCallback);

// @route   GET /api/etsy-oauth/status
// @desc    Get connection status for all user stores
// @access  Private
router.get('/status', etsyOAuthController.getConnectionStatus);

// @route   POST /api/etsy-oauth/refresh/:storeId
// @desc    Manually refresh token for a store
// @access  Private
router.post('/refresh/:storeId', etsyOAuthController.refreshToken);

// @route   DELETE /api/etsy-oauth/disconnect/:storeId
// @desc    Disconnect a store
// @access  Private
router.delete('/disconnect/:storeId', etsyOAuthController.disconnectStore);

// @route   GET /api/etsy-oauth/test-connection/:storeId
// @desc    Test API connection for a store
// @access  Private
router.get('/test-connection/:storeId', etsyOAuthController.testConnection);

module.exports = router;


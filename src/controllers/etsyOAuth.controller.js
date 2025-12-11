const etsyOAuthService = require('../services/etsyOAuth.service');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// In-memory store for OAuth state (in production, use Redis or database)
const oauthStates = new Map();

// Helper function to clean up old OAuth states
function cleanupOldStates() {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [state, data] of oauthStates.entries()) {
    if (data.createdAt < tenMinutesAgo) {
      oauthStates.delete(state);
    }
  }
}

class EtsyOAuthController {
  // @route   GET /api/etsy-oauth/connect
  // @desc    Initiate OAuth connection to Etsy
  // @access  Private
  async initiateConnection(req, res, next) {
    try {
      const userId = req.user.id;
      const scopes = req.query.scopes 
        ? req.query.scopes.split(',') 
        : ['listings_r', 'shops_r', 'transactions_r'];

      // Generate OAuth URL with PKCE
      const { authorizationUrl, state, codeVerifier, scopes: requestedScopes } = 
        etsyOAuthService.buildAuthorizationUrl(userId, scopes);

      // Store state and code verifier temporarily (expires in 10 minutes)
      oauthStates.set(state, {
        userId,
        codeVerifier,
        scopes: requestedScopes,
        createdAt: Date.now(),
      });

      // Clean up old states (older than 10 minutes)
      cleanupOldStates();

      return successResponse(res, {
        authorizationUrl,
        state,
      }, 'OAuth bağlantısı başlatıldı');
    } catch (error) {
      logger.error('Initiate connection error:', error);
      next(error);
    }
  }

  // @route   GET /api/etsy-oauth/callback
  // @desc    Handle OAuth callback from Etsy
  // @access  Public (no auth required as Etsy redirects here)
  async handleCallback(req, res, next) {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.redirect(`${process.env.FRONTEND_URL}/profile?etsy_error=missing_params`);
      }

      // Retrieve stored state data
      const stateData = oauthStates.get(state);
      if (!stateData) {
        return res.redirect(`${process.env.FRONTEND_URL}/profile?etsy_error=invalid_state`);
      }

      // Remove used state
      oauthStates.delete(state);

      const { userId, codeVerifier, scopes } = stateData;

      // Exchange code for tokens
      const tokenData = await etsyOAuthService.exchangeCodeForToken(code, codeVerifier);

      // Get shop information
      const shopInfo = await etsyOAuthService.getShopInfo(tokenData.access_token);

      // Save tokens to database
      await etsyOAuthService.saveTokens(userId, tokenData, shopInfo, scopes);

      // Redirect to frontend with success
      return res.redirect(`${process.env.FRONTEND_URL}/profile?etsy_connected=true&shop_name=${encodeURIComponent(shopInfo.shopName)}`);
    } catch (error) {
      logger.error('OAuth callback error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/profile?etsy_error=connection_failed`);
    }
  }

  // @route   GET /api/etsy-oauth/status
  // @desc    Get OAuth connection status for user's stores
  // @access  Private
  async getConnectionStatus(req, res, next) {
    try {
      const userId = req.user.id;
      const { prisma } = require('../config/database');

      const stores = await prisma.etsyStore.findMany({
        where: { userId },
        select: {
          id: true,
          storeName: true,
          storeUrl: true,
          shopId: true,
          isConnected: true,
          tokenExpiresAt: true,
          scopes: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Check if tokens are expired
      const now = new Date();
      const storesWithStatus = stores.map(store => ({
        ...store,
        tokenStatus: store.isConnected 
          ? (store.tokenExpiresAt && now >= store.tokenExpiresAt ? 'expired' : 'valid')
          : 'disconnected',
      }));

      return successResponse(res, { stores: storesWithStatus }, 'Bağlantı durumu alındı');
    } catch (error) {
      logger.error('Get connection status error:', error);
      next(error);
    }
  }

  // @route   POST /api/etsy-oauth/refresh/:storeId
  // @desc    Manually refresh access token for a store
  // @access  Private
  async refreshToken(req, res, next) {
    try {
      const storeId = parseInt(req.params.storeId);
      const userId = req.user.id;
      const { prisma } = require('../config/database');

      // Verify store belongs to user
      const store = await prisma.etsyStore.findFirst({
        where: {
          id: storeId,
          userId: userId,
        },
      });

      if (!store) {
        return errorResponse(res, 'Mağaza bulunamadı', 404);
      }

      if (!store.isConnected || !store.refreshToken) {
        return errorResponse(res, 'Mağaza bağlı değil', 400);
      }

      // Get valid token (will auto-refresh if needed)
      await etsyOAuthService.getValidAccessToken(storeId);

      return successResponse(res, {}, 'Token yenilendi');
    } catch (error) {
      logger.error('Refresh token error:', error);
      if (error.message === 'Token yenileme başarısız oldu') {
        return errorResponse(res, 'Token yenilenemedi. Lütfen yeniden bağlanın.', 400);
      }
      next(error);
    }
  }

  // @route   DELETE /api/etsy-oauth/disconnect/:storeId
  // @desc    Disconnect Etsy store
  // @access  Private
  async disconnectStore(req, res, next) {
    try {
      const storeId = parseInt(req.params.storeId);
      const userId = req.user.id;

      await etsyOAuthService.disconnectStore(storeId, userId);

      return successResponse(res, {}, 'Mağaza bağlantısı kesildi');
    } catch (error) {
      logger.error('Disconnect store error:', error);
      if (error.message === 'Mağaza bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   GET /api/etsy-oauth/test-connection/:storeId
  // @desc    Test Etsy API connection for a store
  // @access  Private
  async testConnection(req, res, next) {
    try {
      const storeId = parseInt(req.params.storeId);
      const userId = req.user.id;
      const { prisma } = require('../config/database');

      // Verify store belongs to user
      const store = await prisma.etsyStore.findFirst({
        where: {
          id: storeId,
          userId: userId,
        },
      });

      if (!store) {
        return errorResponse(res, 'Mağaza bulunamadı', 404);
      }

      if (!store.isConnected) {
        return errorResponse(res, 'Mağaza bağlı değil', 400);
      }

      // Get valid access token
      const accessToken = await etsyOAuthService.getValidAccessToken(storeId);

      // Test connection by fetching shop info
      const shopInfo = await etsyOAuthService.getShopInfo(accessToken);

      return successResponse(res, {
        connected: true,
        shopInfo,
        scopes: store.scopes,
      }, 'Bağlantı başarılı');
    } catch (error) {
      logger.error('Test connection error:', error);
      return errorResponse(res, 'Bağlantı testi başarısız', 500);
    }
  }
}

module.exports = new EtsyOAuthController();


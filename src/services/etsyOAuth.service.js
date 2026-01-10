const crypto = require('crypto');
const axios = require('axios');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

class EtsyOAuthService {
  constructor() {
    this.clientId = process.env.ETSY_CLIENT_ID;
    this.clientSecret = process.env.ETSY_CLIENT_SECRET;
    this.redirectUri = process.env.ETSY_REDIRECT_URI;
    this.baseUrl = 'https://api.etsy.com/v3';
    this.authUrl = 'https://www.etsy.com/oauth/connect';
    this.tokenUrl = 'https://api.etsy.com/v3/public/oauth/token';
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE() {
    // Generate code verifier (43-128 characters)
    const codeVerifier = crypto
      .randomBytes(32)
      .toString('base64url');

    // Generate code challenge (SHA256 hash of verifier)
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate random state for OAuth flow
   */
  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Build authorization URL for user to connect Etsy
   * @param {string} userId - User ID to associate with OAuth flow
   * @param {string[]} scopes - Requested scopes
   * @returns {Object} - Authorization URL and state/verifier for session
   */
  buildAuthorizationUrl(userId, scopes = ['listings_r', 'shops_r']) {
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    const state = this.generateState();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authorizationUrl = `${this.authUrl}?${params.toString()}`;

    return {
      authorizationUrl,
      state,
      codeVerifier,
      scopes,
    };
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from Etsy
   * @param {string} codeVerifier - PKCE code verifier
   * @returns {Object} - Token response
   */
  async exchangeCodeForToken(code, codeVerifier) {
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          redirect_uri: this.redirectUri,
          code: code,
          code_verifier: codeVerifier,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Token alışverişi başarısız oldu');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} - New token response
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Token yenileme başarısız oldu');
    }
  }

  /**
   * Get shop information from Etsy
   * @param {string} accessToken - Access token
   * @returns {Object} - Shop information
   */
  async getShopInfo(accessToken) {
    try {
      // First, get the user's shop ID
      const userResponse = await axios.get(`${this.baseUrl}/application/users/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-api-key': `${this.clientId}:${this.clientSecret}`,
        },
      });

      const userId = userResponse.data.user_id;
      logger.info(`🔍 Getting shops for user ID: ${userId}`);

      // Then get shop details
      const shopsResponse = await axios.get(
        `${this.baseUrl}/application/users/${userId}/shops`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-api-key': `${this.clientId}:${this.clientSecret}`,
          },
        }
      );

      logger.info(`📦 Etsy shops response:`, JSON.stringify(shopsResponse.data, null, 2));

      if (shopsResponse.data.results && shopsResponse.data.results.length > 0) {
        const shop = shopsResponse.data.results[0];
        return {
          shopId: shop.shop_id.toString(),
          shopName: shop.shop_name,
          url: shop.url,
        };
      }

      throw new Error('Mağaza bulunamadı');
    } catch (error) {
      logger.error('Error getting shop info:', error.response?.data || error.message);
      throw new Error('Mağaza bilgileri alınamadı');
    }
  }

  /**
   * Save OAuth tokens to database
   * @param {number} userId - User ID
   * @param {Object} tokenData - Token data from Etsy
   * @param {Object} shopInfo - Shop information
   * @param {string[]} scopes - Granted scopes
   */
  async saveTokens(userId, tokenData, shopInfo, scopes) {
    try {
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Check if store already exists for this shop
      const existingStore = await prisma.etsyStore.findFirst({
        where: {
          userId,
          shopId: shopInfo.shopId,
        },
      });

      let store;
      if (existingStore) {
        // Update existing store
        store = await prisma.etsyStore.update({
          where: { id: existingStore.id },
          data: {
            accessToken: this.encryptToken(tokenData.access_token),
            refreshToken: this.encryptToken(tokenData.refresh_token),
            tokenExpiresAt: expiresAt,
            scopes: scopes,
            isConnected: true,
            storeName: shopInfo.shopName,
            storeUrl: shopInfo.url,
          },
        });
      } else {
        // Create new store
        store = await prisma.etsyStore.create({
          data: {
            userId,
            shopId: shopInfo.shopId,
            storeName: shopInfo.shopName,
            storeUrl: shopInfo.url,
            accessToken: this.encryptToken(tokenData.access_token),
            refreshToken: this.encryptToken(tokenData.refresh_token),
            tokenExpiresAt: expiresAt,
            scopes: scopes,
            isConnected: true,
          },
        });
      }

      logger.info(`✅ OAuth tokens saved for user ${userId}, shop ${shopInfo.shopId}`);
      return store;
    } catch (error) {
      logger.error('Error saving tokens:', error.message);
      throw error;
    }
  }

  /**
   * Encrypt token for secure storage
   * @param {string} token - Token to encrypt
   * @returns {string} - Encrypted token
   */
  encryptToken(token) {
    // Simple encryption - in production, use proper encryption library
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-32chars', 'utf-8').slice(0, 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt token from storage
   * @param {string} encryptedToken - Encrypted token
   * @returns {string} - Decrypted token
   */
  decryptToken(encryptedToken) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-32chars', 'utf-8').slice(0, 32);
    
    const [ivHex, encrypted] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get valid access token for a store (refresh if needed)
   * @param {number} storeId - Store ID
   * @returns {string} - Valid access token
   */
  async getValidAccessToken(storeId) {
    const store = await prisma.etsyStore.findUnique({
      where: { id: storeId },
    });

    if (!store || !store.isConnected) {
      throw new Error('Mağaza bağlantısı bulunamadı');
    }

    // Check if token is expired or about to expire (5 minutes buffer)
    const now = new Date();
    const expiryBuffer = new Date(store.tokenExpiresAt.getTime() - 5 * 60 * 1000);

    if (now >= expiryBuffer) {
      // Token expired or about to expire, refresh it
      logger.info(`Token expired for store ${storeId}, refreshing...`);
      
      const decryptedRefreshToken = this.decryptToken(store.refreshToken);
      const newTokenData = await this.refreshAccessToken(decryptedRefreshToken);
      
      // Update tokens in database
      const expiresAt = new Date(Date.now() + newTokenData.expires_in * 1000);
      await prisma.etsyStore.update({
        where: { id: storeId },
        data: {
          accessToken: this.encryptToken(newTokenData.access_token),
          refreshToken: this.encryptToken(newTokenData.refresh_token),
          tokenExpiresAt: expiresAt,
        },
      });

      return newTokenData.access_token;
    }

    // Token still valid, decrypt and return
    return this.decryptToken(store.accessToken);
  }

  /**
   * Disconnect Etsy store (revoke tokens)
   * @param {number} storeId - Store ID
   * @param {number} userId - User ID (for verification)
   */
  async disconnectStore(storeId, userId) {
    try {
      const store = await prisma.etsyStore.findFirst({
        where: {
          id: storeId,
          userId: userId,
        },
      });

      if (!store) {
        throw new Error('Mağaza bulunamadı');
      }

      // Update store to disconnect
      await prisma.etsyStore.update({
        where: { id: storeId },
        data: {
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isConnected: false,
        },
      });

      logger.info(`✅ Store ${storeId} disconnected for user ${userId}`);
      return { message: 'Mağaza bağlantısı kesildi' };
    } catch (error) {
      logger.error('Error disconnecting store:', error.message);
      throw error;
    }
  }
}

module.exports = new EtsyOAuthService();


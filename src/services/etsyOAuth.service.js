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
      logger.info(`🔐 Getting shop info with access token: ${accessToken.substring(0, 20)}...`);
      
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

      // Etsy API returns shop object directly, not in results array
      if (shopsResponse.data && shopsResponse.data.shop_id) {
        return {
          shopId: shopsResponse.data.shop_id.toString(),
          shopName: shopsResponse.data.shop_name,
          url: shopsResponse.data.url,
        };
      }

      throw new Error('Mağaza bulunamadı');
    } catch (error) {
      logger.error('❌ Error getting shop info - Full error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
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
      
      try {
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

        logger.info(`✅ Token refreshed successfully for store ${storeId}`);
        return newTokenData.access_token;
      } catch (error) {
        // Token refresh failed - mark store as disconnected
        logger.error(`❌ Token refresh failed for store ${storeId}:`, error.message);
        await prisma.etsyStore.update({
          where: { id: storeId },
          data: { isConnected: false },
        });
        throw new Error('Token süresi doldu. Lütfen Etsy mağazanızı yeniden bağlayın.');
      }
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

  /**
   * Get shop receipts (transactions/sales)
   * @param {string} shopId - Etsy shop ID
   * @param {string} accessToken - Valid access token
   * @param {Object} options - Query options (limit, offset, min_created, max_created)
   * @returns {Object} - Receipts data from Etsy API
   */
  async getShopReceipts(shopId, accessToken, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        min_created = null,
        max_created = null,
      } = options;

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (min_created) params.append('min_created', Math.floor(min_created.getTime() / 1000));
      if (max_created) params.append('max_created', Math.floor(max_created.getTime() / 1000));

      logger.info(`🔍 Fetching receipts for shop ${shopId} (limit: ${limit}, offset: ${offset})`);

      const response = await axios.get(
        `${this.baseUrl}/application/shops/${shopId}/receipts?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-api-key': `${this.clientId}:${this.clientSecret}`,
          },
        }
      );

      logger.info(`✅ Fetched ${response.data.results?.length || 0} receipts for shop ${shopId}`);
      return response.data;
    } catch (error) {
      logger.error(`❌ Error fetching receipts for shop ${shopId}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error('Satış verileri alınamadı');
    }
  }

  /**
   * Get shop listings (products)
   * @param {string} shopId - Etsy shop ID
   * @param {string} accessToken - Valid access token
   * @param {Object} options - Query options (limit, offset, state)
   * @returns {Object} - Listings data from Etsy API
   */
  async getShopListings(shopId, accessToken, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        state = 'active', // 'active', 'inactive', 'draft', 'expired', etc.
      } = options;

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        state: state,
      });

      logger.info(`🔍 Fetching listings for shop ${shopId} (state: ${state}, limit: ${limit})`);

      const response = await axios.get(
        `${this.baseUrl}/application/shops/${shopId}/listings/${state}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-api-key': `${this.clientId}:${this.clientSecret}`,
          },
        }
      );

      logger.info(`✅ Fetched ${response.data.results?.length || 0} listings for shop ${shopId}`);
      return response.data;
    } catch (error) {
      logger.error(`❌ Error fetching listings for shop ${shopId}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error('Ürün listesi alınamadı');
    }
  }

  /**
   * Get listing by ID with detailed info
   * @param {string} listingId - Etsy listing ID
   * @param {string} accessToken - Valid access token
   * @returns {Object} - Listing data from Etsy API
   */
  async getListingById(listingId, accessToken) {
    try {
      logger.info(`🔍 Fetching listing ${listingId}`);

      const response = await axios.get(
        `${this.baseUrl}/application/listings/${listingId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-api-key': `${this.clientId}:${this.clientSecret}`,
          },
        }
      );

      logger.info(`✅ Fetched listing ${listingId}`);
      return response.data;
    } catch (error) {
      logger.error(`❌ Error fetching listing ${listingId}:`, {
        message: error.message,
        status: error.response?.status,
      });
      throw new Error('Ürün bilgisi alınamadı');
    }
  }

  /**
   * Get shop statistics (aggregated from receipts and listings)
   * @param {string} shopId - Etsy shop ID
   * @param {string} accessToken - Valid access token
   * @returns {Object} - Aggregated shop statistics
   */
  async getShopStats(shopId, accessToken) {
    try {
      logger.info(`📊 Calculating shop stats for shop ${shopId}`);

      // Fetch recent receipts (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const receiptsData = await this.getShopReceipts(shopId, accessToken, {
        limit: 100,
        min_created: ninetyDaysAgo,
      });

      const receipts = receiptsData.results || [];
      const count = receiptsData.count || 0;

      // Calculate stats
      let totalSales = count;
      let totalRevenue = 0;
      let totalItems = 0;

      receipts.forEach((receipt) => {
        // grandtotal is the total amount paid by buyer (including tax, shipping)
        totalRevenue += parseFloat(receipt.grandtotal?.amount || 0);
        totalItems += receipt.transactions?.length || 0;
      });

      const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Fetch active listings count
      const listingsData = await this.getShopListings(shopId, accessToken, {
        limit: 1, // Just to get count
        state: 'active',
      });

      const activeListings = listingsData.count || 0;

      const stats = {
        totalSales,
        totalRevenue: totalRevenue.toFixed(2),
        avgOrderValue: avgOrderValue.toFixed(2),
        activeListings,
        period: '90_days',
      };

      logger.info(`✅ Shop stats calculated for shop ${shopId}:`, stats);
      return stats;
    } catch (error) {
      logger.error(`❌ Error calculating shop stats for shop ${shopId}:`, error.message);
      throw new Error('Mağaza istatistikleri hesaplanamadı');
    }
  }
}

module.exports = new EtsyOAuthService();


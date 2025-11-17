const axios = require('axios');
const axiosRetry = require('axios-retry');
const { prisma } = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

// Configure axios retry for subscription API
axiosRetry(axios, {
  retries: 2, // Retry 2 times (3 total attempts)
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500);
  },
  onRetry: (retryCount, error, requestConfig) => {
    logger.warn(`Subscription API retry ${retryCount}/2: ${requestConfig.url}`);
  },
});

class SubscriptionService {
  constructor() {
    this.apiBaseUrl = 'https://kpi-crm-api.digienskampus.com/webhook';
  }

  /**
   * Kullanıcının premium abonelik durumunu kontrol eder
   * @param {string} email - Kullanıcı email adresi
   * @returns {Promise<{success: boolean, hasActiveSubscription: boolean, message: string}>}
   */
  async checkPremiumSubscription(email) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/check-subscription`, {
        params: {
          email: email,
          type: 'PREMIUM'
        },
        timeout: 10000, // 10 seconds timeout (increased from 5s for retry)
      });

      logger.info(`Subscription check for ${email}:`, response.data);

      return {
        success: response.data.success || false,
        hasActiveSubscription: response.data.hasActiveSubscription || false,
        message: response.data.message || ''
      };
    } catch (error) {
      logger.error('Subscription check API error:', error.message);
      
      // API hatası durumunda güvenli tarafta kal (false döndür)
      return {
        success: false,
        hasActiveSubscription: false,
        message: 'Abonelik kontrolü yapılamadı'
      };
    }
  }

  /**
   * Kullanıcının abonelik durumunu veritabanında günceller
   * @param {string} email - Kullanıcı email adresi
   * @returns {Promise<boolean>}
   */
  async updateUserSubscriptionStatus(email) {
    try {
      const subscriptionData = await this.checkPremiumSubscription(email);

      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          hasActiveSubscription: subscriptionData.hasActiveSubscription,
          subscriptionCheckedAt: new Date(),
        },
        select: {
          id: true,
          hasActiveSubscription: true,
        },
      });

      // Invalidate cache for this user
      const cacheKey = `user:${updatedUser.id}:subscription`;
      await cache.del(cacheKey);
      // Also update cache with new value
      await cache.set(cacheKey, updatedUser.hasActiveSubscription, 3600);

      logger.info(`Subscription status updated for ${email}: ${subscriptionData.hasActiveSubscription}`);
      
      return subscriptionData.hasActiveSubscription;
    } catch (error) {
      logger.error('Error updating subscription status:', error);
      throw error;
    }
  }

  /**
   * Kullanıcının premium erişimi olup olmadığını kontrol eder (cache ile)
   * @param {number} userId - Kullanıcı ID
   * @returns {Promise<boolean>}
   */
  async hasActivePremiumSubscription(userId) {
    try {
      // Try Redis cache first
      const cacheKey = `user:${userId}:subscription`;
      const cachedStatus = await cache.get(cacheKey);
      
      if (cachedStatus !== null) {
        logger.debug(`Subscription cache hit for user ${userId}`);
        return cachedStatus;
      }

      // Cache miss - get from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          hasActiveSubscription: true,
          subscriptionCheckedAt: true,
        },
      });

      if (!user) {
        return false;
      }

      let hasActivePremium = user.hasActiveSubscription || false;

      // Eğer son kontrol 1 saatten eskiyse, yeniden kontrol et
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (!user.subscriptionCheckedAt || user.subscriptionCheckedAt < oneHourAgo) {
        logger.info(`Subscription cache expired for user ${userId}, checking again...`);
        hasActivePremium = await this.updateUserSubscriptionStatus(user.email);
      }

      // Cache the result for 1 hour
      await cache.set(cacheKey, hasActivePremium, 3600);

      return hasActivePremium;
    } catch (error) {
      logger.error('Error checking premium subscription:', error);
      return false; // Hata durumunda false döndür
    }
  }
}

module.exports = new SubscriptionService();


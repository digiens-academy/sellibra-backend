const axios = require('axios');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

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
        timeout: 5000, // 5 saniye timeout
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

      await prisma.user.update({
        where: { email },
        data: {
          hasActiveSubscription: subscriptionData.hasActiveSubscription,
          subscriptionCheckedAt: new Date(),
        },
      });

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

      // Eğer son kontrol 1 saatten eskiyse, yeniden kontrol et
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (!user.subscriptionCheckedAt || user.subscriptionCheckedAt < oneHourAgo) {
        logger.info(`Subscription cache expired for user ${userId}, checking again...`);
        return await this.updateUserSubscriptionStatus(user.email);
      }

      return user.hasActiveSubscription || false;
    } catch (error) {
      logger.error('Error checking premium subscription:', error);
      return false; // Hata durumunda false döndür
    }
  }
}

module.exports = new SubscriptionService();


const { prisma } = require('../config/database');
const { formatUser } = require('../utils/helpers');
const googleSheetsService = require('./googleSheets.service');
const logger = require('../utils/logger');

class UserService {
  // Get user profile
  async getProfile(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          etsyStores: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      return formatUser(user);
    } catch (error) {
      logger.error('Get profile error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: updates.firstName || undefined,
          lastName: updates.lastName || undefined,
          phoneNumber: updates.phoneNumber !== undefined ? updates.phoneNumber : undefined,
        },
      });

      // Sync to Google Sheets immediately (async, non-blocking)
      setImmediate(async () => {
        try {
          await googleSheetsService.updateUserInSheet(user.email, updates);
          logger.info(`User ${user.email} profile updated in Google Sheets`);
        } catch (error) {
          logger.error('Google Sheets sync failed during profile update:', error);
        }
      });

      return formatUser(user);
    } catch (error) {
      logger.error('Update profile error:', error);
      throw error;
    }
  }

  // Check if tokens need to be reset (daily reset)
  async checkAndResetTokens(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Check if last reset was more than 24 hours ago
      const now = new Date();
      const lastReset = new Date(user.lastTokenReset);
      const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

      // Reset tokens if more than 24 hours have passed
      if (hoursSinceReset >= 24) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            dailyTokens: 40,
            lastTokenReset: now,
          },
        });
        logger.info(`Tokens reset for user ${userId}`);
        return updatedUser;
      }

      return user;
    } catch (error) {
      logger.error('Check and reset tokens error:', error);
      throw error;
    }
  }

  // Get user tokens (with auto-reset check)
  async getUserTokens(userId) {
    try {
      const user = await this.checkAndResetTokens(userId);
      return {
        dailyTokens: user.dailyTokens,
        lastTokenReset: user.lastTokenReset,
      };
    } catch (error) {
      logger.error('Get user tokens error:', error);
      throw error;
    }
  }

  // Consume tokens
  async consumeTokens(userId, tokenAmount) {
    try {
      // First check and reset if needed
      const user = await this.checkAndResetTokens(userId);

      if (user.dailyTokens < tokenAmount) {
        throw new Error('Yetersiz token. Günlük token limitinize ulaştınız.');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          dailyTokens: user.dailyTokens - tokenAmount,
        },
      });

      logger.info(`User ${userId} consumed ${tokenAmount} tokens. Remaining: ${updatedUser.dailyTokens}`);
      
      return {
        success: true,
        remainingTokens: updatedUser.dailyTokens,
      };
    } catch (error) {
      logger.error('Consume tokens error:', error);
      throw error;
    }
  }

  // Check if user has enough tokens
  async hasEnoughTokens(userId, requiredTokens) {
    try {
      const user = await this.checkAndResetTokens(userId);
      return user.dailyTokens >= requiredTokens;
    } catch (error) {
      logger.error('Check tokens error:', error);
      throw error;
    }
  }
}

module.exports = new UserService();


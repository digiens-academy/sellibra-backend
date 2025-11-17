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

      // Sync to Google Sheets (async, non-blocking) - direct sync without queue
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

  // Consume tokens (atomic operation to prevent race conditions)
  async consumeTokens(userId, tokenAmount) {
    try {
      // Atomic update: Check, reset if needed, and consume in a single database operation
      // This prevents race conditions when multiple requests try to consume tokens simultaneously
      const result = await prisma.$executeRaw`
        UPDATE users 
        SET 
          daily_tokens = CASE 
            -- If last reset was more than 24 hours ago, reset to 40 and then subtract
            WHEN last_token_reset < NOW() - INTERVAL '24 hours' 
            THEN 40 - ${tokenAmount}
            -- Otherwise, just subtract from current tokens
            ELSE daily_tokens - ${tokenAmount}
          END,
          last_token_reset = CASE 
            -- Update reset time if it was reset
            WHEN last_token_reset < NOW() - INTERVAL '24 hours' 
            THEN NOW()
            ELSE last_token_reset
          END
        WHERE id = ${userId}
          AND (
            -- Allow if tokens will be reset (more than 24 hours passed)
            (last_token_reset < NOW() - INTERVAL '24 hours')
            OR
            -- Allow if current tokens are sufficient (less than 24 hours passed)
            (last_token_reset >= NOW() - INTERVAL '24 hours' AND daily_tokens >= ${tokenAmount})
          )
      `;

      if (result === 0) {
        // No rows updated means either user doesn't exist or insufficient tokens
        // Check if user exists first
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, dailyTokens: true, lastTokenReset: true },
        });

        if (!user) {
          throw new Error('Kullanıcı bulunamadı');
        }

        // Check if it's a reset case
        const now = new Date();
        const lastReset = new Date(user.lastTokenReset);
        const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);
        const effectiveTokens = hoursSinceReset >= 24 ? 40 : user.dailyTokens;

        if (effectiveTokens < tokenAmount) {
          throw new Error('Yetersiz token. Günlük token limitinize ulaştınız.');
        }

        // This shouldn't happen, but throw generic error
        throw new Error('Token tüketimi başarısız oldu');
      }

      // Get updated user to return remaining tokens
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { dailyTokens: true },
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


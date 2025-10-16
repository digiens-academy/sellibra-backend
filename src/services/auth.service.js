const bcrypt = require('bcrypt');
const { prisma } = require('../config/database');
const { generateToken, formatUser } = require('../utils/helpers');
const googleSheetsService = require('./googleSheets.service');
const etsyService = require('./etsy.service');
const subscriptionService = require('./subscription.service');
const logger = require('../utils/logger');

class AuthService {
  // Register new user
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new Error('Bu e-posta adresi zaten kayıtlı');
      }

      // Etsy mağaza URL'si zorunlu kontrol
      if (!userData.etsyStoreUrl || userData.etsyStoreUrl.trim() === '') {
        throw new Error('Etsy mağaza URL\'si zorunludur');
      }

      // Normalize edilmiş URL'yi kaydet (doğrulama yapılmıyor)
      const normalizedEtsyUrl = etsyService.normalizeEtsyUrl(userData.etsyStoreUrl);
      
      if (!normalizedEtsyUrl) {
        throw new Error('Geçersiz Etsy mağaza URL formatı');
      }
      
      logger.info(`Etsy mağaza URL kaydediliyor: ${normalizedEtsyUrl} (${userData.email})`);

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: hashedPassword,
          phoneNumber: userData.phoneNumber || null,
          etsyStoreUrl: normalizedEtsyUrl || userData.etsyStoreUrl || null,
        },
      });

      // Generate token
      const token = generateToken(user.id);

      // Check premium subscription synchronously to include in response
      try {
        await subscriptionService.updateUserSubscriptionStatus(user.email);
        logger.info(`Subscription status checked for ${user.email}`);
      } catch (error) {
        logger.error('Subscription check failed during registration:', error);
        // Continue even if subscription check fails
      }

      // Get updated user with subscription status
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      // Sync to Google Sheets (async, non-blocking - can happen in background)
      setImmediate(async () => {
        try {
          await googleSheetsService.appendUserToSheet(updatedUser || user);
          logger.info(`User ${user.email} synced to Google Sheets`);
        } catch (error) {
          logger.error('Google Sheets sync failed during registration:', error);
        }
      });

      return {
        user: formatUser(updatedUser || user),
        token,
      };
    } catch (error) {
      logger.error('Register error:', error);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error('E-posta veya şifre hatalı');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error('E-posta veya şifre hatalı');
      }

      // Generate token
      const token = generateToken(user.id);

      // Check premium subscription synchronously to include in response
      try {
        await subscriptionService.updateUserSubscriptionStatus(user.email);
        logger.info(`Subscription status checked for ${user.email}`);
      } catch (error) {
        logger.error('Subscription check failed during login:', error);
        // Continue even if subscription check fails
      }

      // Get updated user with subscription status
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      return {
        user: formatUser(updatedUser || user),
        token,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Check premium subscription if last check was more than 1 hour ago
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (!user.subscriptionCheckedAt || user.subscriptionCheckedAt < oneHourAgo) {
        try {
          await subscriptionService.updateUserSubscriptionStatus(user.email);
          logger.info(`Subscription status updated for ${user.email}`);
          
          // Get updated user with fresh subscription status
          const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
          });
          
          return formatUser(updatedUser || user);
        } catch (error) {
          logger.error('Subscription check failed in getCurrentUser:', error);
          // Continue with existing user data if subscription check fails
        }
      }

      return formatUser(user);
    } catch (error) {
      logger.error('Get current user error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();


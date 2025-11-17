const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { prisma } = require('../config/database');
const { generateToken, formatUser } = require('../utils/helpers');
const googleSheetsService = require('./googleSheets.service');
const etsyService = require('./etsy.service');
const subscriptionService = require('./subscription.service');
const emailService = require('./email.service');
const adminService = require('./admin.service');
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

      // Sistem ayarlarından default değerleri al
      const defaultPrintNestConfirmed = await adminService.getSettingValue(
        'default_printnest_confirmed', 
        true  // Default olarak true
      );
      const defaultDailyTokens = await adminService.getSettingValue(
        'default_daily_tokens', 
        40
      );

      // Use transaction for atomic user and store creation
      const user = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: hashedPassword,
            phoneNumber: userData.phoneNumber || null,
            etsyStoreUrl: normalizedEtsyUrl || userData.etsyStoreUrl || null,
            printNestConfirmed: defaultPrintNestConfirmed,
            dailyTokens: defaultDailyTokens,
          },
        });

        // Add Etsy store to etsy_stores table (within same transaction)
        try {
          await tx.etsyStore.create({
            data: {
              userId: newUser.id,
              storeUrl: normalizedEtsyUrl,
              storeName: null,
            },
          });
          logger.info(`✅ Etsy store added to etsy_stores table for user ${newUser.email}`);
        } catch (error) {
          logger.error('Failed to add store to etsy_stores table during registration:', error);
          // Transaction will rollback if this fails
          throw error;
        }

        return newUser;
      });

      // Generate token
      const token = generateToken(user.id);

      // Check premium subscription synchronously to include in response (outside transaction)
      try {
        await subscriptionService.updateUserSubscriptionStatus(user.email);
        logger.info(`Subscription status checked for ${user.email}`);
      } catch (error) {
        logger.error('Subscription check failed during registration:', error);
        // Continue even if subscription check fails
      }

      // Get updated user with subscription status (use select to get only needed fields)
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          etsyStoreUrl: true,
          role: true,
          isSuperAdmin: true,
          hasActiveSubscription: true,
          subscriptionCheckedAt: true,
          registeredAt: true,
          printNestConfirmed: true,
          dailyTokens: true,
          lastTokenReset: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Sync to Google Sheets via queue (async, non-blocking)
      const { queues } = require('../config/queue');
      if (queues.googleSheetsSync) {
        queues.googleSheetsSync.add(
          'sync-user',
          {
            type: 'append-user',
            data: { user: updatedUser || user },
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          }
        ).catch((error) => {
          logger.error('Failed to queue Google Sheets sync:', error);
        });
      } else {
        // Fallback to direct sync if queue not available
        setImmediate(async () => {
          try {
            await googleSheetsService.appendUserToSheet(updatedUser || user);
            logger.info(`User ${user.email} synced to Google Sheets`);
          } catch (error) {
            logger.error('Google Sheets sync failed during registration:', error);
          }
        });
      }

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

      // Check if user has no password (imported from Google Sheets)
      if (!user.password) {
        throw new Error('Henüz şifre belirlemediniz. Lütfen "Şifremi Unuttum" seçeneğini kullanarak şifrenizi belirleyin.');
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

      // Get updated user with subscription status (use select to get only needed fields)
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          etsyStoreUrl: true,
          role: true,
          isSuperAdmin: true,
          hasActiveSubscription: true,
          subscriptionCheckedAt: true,
          registeredAt: true,
          printNestConfirmed: true,
          dailyTokens: true,
          lastTokenReset: true,
          createdAt: true,
          updatedAt: true,
        },
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
          
          // Get updated user with fresh subscription status (use select)
          const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              etsyStoreUrl: true,
              role: true,
              isSuperAdmin: true,
              hasActiveSubscription: true,
              subscriptionCheckedAt: true,
              registeredAt: true,
              printNestConfirmed: true,
              dailyTokens: true,
              lastTokenReset: true,
              createdAt: true,
              updatedAt: true,
            },
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

  // Request password reset
  async requestPasswordReset(email) {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // For security reasons, don't reveal if email exists or not
      if (!user) {
        logger.info(`Password reset requested for non-existent email: ${email}`);
        // Still return success to prevent email enumeration
        return { message: 'Eğer bu e-posta kayıtlıysa, şifre sıfırlama linki gönderildi' };
      }

      // Generate reset token (32 bytes = 64 hex characters)
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Token expires in 1 hour
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      // Save token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(
          user.email,
          resetToken,
          user.firstName
        );
        logger.info(`Password reset email sent to ${user.email}`);
      } catch (emailError) {
        logger.error('Failed to send password reset email:', emailError);
        // Clear the token if email fails
        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetToken: null,
            resetTokenExpiry: null,
          },
        });
        throw new Error('E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.');
      }

      return { message: 'Eğer bu e-posta kayıtlıysa, şifre sıfırlama linki gönderildi' };
    } catch (error) {
      logger.error('Request password reset error:', error);
      throw error;
    }
  }

  // Verify reset token
  async verifyResetToken(token) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gte: new Date(), // Token must not be expired
          },
        },
      });

      if (!user) {
        throw new Error('Geçersiz veya süresi dolmuş token');
      }

      return { valid: true, email: user.email };
    } catch (error) {
      logger.error('Verify reset token error:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      // Find user with valid token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gte: new Date(), // Token must not be expired
          },
        },
      });

      if (!user) {
        throw new Error('Geçersiz veya süresi dolmuş token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      logger.info(`Password reset successful for user: ${user.email}`);

      return { message: 'Şifreniz başarıyla sıfırlandı' };
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();


const { prisma } = require('../config/database');
const { formatUser } = require('../utils/helpers');
const googleSheetsService = require('./googleSheets.service');
const logger = require('../utils/logger');

class AdminService {
  // Get all users
  async getAllUsers(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const where = {};

      // Search by email or name
      if (filters.search) {
        where.OR = [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Filter by confirmed status
      if (filters.printNestConfirmed !== undefined) {
        where.printNestConfirmed = filters.printNestConfirmed === 'true';
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { registeredAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users: users.map(formatUser),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get all users error:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          printNestSessions: {
            orderBy: { iframeOpenedAt: 'desc' },
            take: 10,
          },
          etsyStores: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      return {
        ...formatUser(user),
        printNestSessions: user.printNestSessions,
        etsyStores: user.etsyStores,
      };
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }

  // Confirm PrintNest registration
  async confirmPrintNestRegistration(userId) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { printNestConfirmed: true },
      });

      // Sync to Google Sheets immediately (async, non-blocking)
      setImmediate(async () => {
        try {
          await googleSheetsService.markUserAsPrintNestConfirmed(user.email, user.id);
          logger.info(`User ${user.email} PrintNest confirmation synced to Google Sheets`);
        } catch (error) {
          logger.error('Google Sheets sync failed during confirmation:', error);
        }
      });

      logger.info(`User ${user.email} confirmed as PrintNest registered`);
      return formatUser(user);
    } catch (error) {
      logger.error('Confirm PrintNest registration error:', error);
      throw error;
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      // Check if user is super admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      if (user.isSuperAdmin) {
        throw new Error('Super admin kullanıcısı silinemez');
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      logger.info(`User ${userId} deleted`);
      return { success: true };
    } catch (error) {
      logger.error('Delete user error:', error);
      throw error;
    }
  }

  // Update user role
  async updateUserRole(userId, role) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      logger.info(`User ${userId} role updated to ${role}`);
      return formatUser(user);
    } catch (error) {
      logger.error('Update user role error:', error);
      throw error;
    }
  }

  // Update user tokens
  async updateUserTokens(userId, dailyTokens) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { 
          dailyTokens,
          lastTokenReset: new Date(),
        },
      });

      logger.info(`User ${userId} tokens updated to ${dailyTokens}`);
      return formatUser(user);
    } catch (error) {
      logger.error('Update user tokens error:', error);
      throw error;
    }
  }

  // Reset user tokens to default
  async resetUserTokens(userId) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { 
          dailyTokens: 40, // Default token amount
          lastTokenReset: new Date(),
        },
      });

      logger.info(`User ${userId} tokens reset to default (40)`);
      return formatUser(user);
    } catch (error) {
      logger.error('Reset user tokens error:', error);
      throw error;
    }
  }

  // Get sync logs
  async getSyncLogs(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.googleSheetsSyncLog.findMany({
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { syncedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.googleSheetsSyncLog.count(),
      ]);

      return {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get sync logs error:', error);
      throw error;
    }
  }

  // Get system settings
  async getSystemSettings() {
    try {
      const settings = await prisma.systemSettings.findMany();
      
      // Eğer ayarlar yoksa, default ayarları oluştur
      if (settings.length === 0) {
        await this.initializeDefaultSettings();
        return await prisma.systemSettings.findMany();
      }
      
      // Ayarları key-value objesine çevir
      const settingsObj = {};
      settings.forEach(setting => {
        let value = setting.settingValue;
        
        // Type'a göre dönüştür
        if (setting.settingType === 'boolean') {
          value = value === 'true';
        } else if (setting.settingType === 'number') {
          value = parseFloat(value);
        }
        
        settingsObj[setting.settingKey] = {
          value,
          type: setting.settingType,
          description: setting.description,
        };
      });
      
      return settingsObj;
    } catch (error) {
      logger.error('Get system settings error:', error);
      throw error;
    }
  }

  // Initialize default settings
  async initializeDefaultSettings() {
    try {
      const defaultSettings = [
        {
          settingKey: 'default_printnest_confirmed',
          settingValue: 'true',
          settingType: 'boolean',
          description: 'Yeni kullanıcılar varsayılan olarak PrintNest onaylı mı olsun?',
        },
        {
          settingKey: 'default_daily_tokens',
          settingValue: '40',
          settingType: 'number',
          description: 'Yeni kullanıcılar için varsayılan günlük token sayısı',
        },
      ];
      
      for (const setting of defaultSettings) {
        await prisma.systemSettings.upsert({
          where: { settingKey: setting.settingKey },
          update: {},
          create: setting,
        });
      }
      
      logger.info('Default system settings initialized');
    } catch (error) {
      logger.error('Initialize default settings error:', error);
      throw error;
    }
  }

  // Update system setting
  async updateSystemSetting(settingKey, settingValue) {
    try {
      // Değeri string'e çevir
      const valueStr = String(settingValue);
      
      const setting = await prisma.systemSettings.upsert({
        where: { settingKey },
        update: { settingValue: valueStr },
        create: {
          settingKey,
          settingValue: valueStr,
          settingType: typeof settingValue === 'boolean' ? 'boolean' : 
                       typeof settingValue === 'number' ? 'number' : 'string',
        },
      });
      
      logger.info(`System setting ${settingKey} updated to ${valueStr}`);
      return setting;
    } catch (error) {
      logger.error('Update system setting error:', error);
      throw error;
    }
  }

  // Get single setting value (helper)
  async getSettingValue(settingKey, defaultValue = null) {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { settingKey },
      });
      
      if (!setting) return defaultValue;
      
      // Type'a göre dönüştür
      if (setting.settingType === 'boolean') {
        return setting.settingValue === 'true';
      } else if (setting.settingType === 'number') {
        return parseFloat(setting.settingValue);
      }
      
      return setting.settingValue;
    } catch (error) {
      logger.error('Get setting value error:', error);
      return defaultValue;
    }
  }
}

module.exports = new AdminService();


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
        },
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      return {
        ...formatUser(user),
        printNestSessions: user.printNestSessions,
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
}

module.exports = new AdminService();


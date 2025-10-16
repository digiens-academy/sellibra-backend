const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/database');
const { calculateTimeDifference } = require('../utils/helpers');
const logger = require('../utils/logger');

class PrintNestService {
  // Create new session
  async createSession(userId, metadata) {
    try {
      const session = await prisma.printNestSession.create({
        data: {
          userId,
          sessionId: uuidv4(),
          userIp: metadata.userIp || null,
          userAgent: metadata.userAgent || null,
          referrerPage: metadata.referrerPage || null,
        },
      });

      logger.info(`PrintNest session created: ${session.sessionId} for user ${userId}`);
      return session;
    } catch (error) {
      logger.error('Create session error:', error);
      throw error;
    }
  }

  // Update session (close)
  async updateSession(sessionId, data) {
    try {
      const session = await prisma.printNestSession.findUnique({
        where: { sessionId },
      });

      if (!session) {
        throw new Error('Session bulunamadı');
      }

      // Calculate time spent if closed
      let totalTimeSpent = data.totalTimeSpent;
      if (data.iframeClosedAt && !totalTimeSpent) {
        totalTimeSpent = calculateTimeDifference(session.iframeOpenedAt, data.iframeClosedAt);
      }

      const updatedSession = await prisma.printNestSession.update({
        where: { sessionId },
        data: {
          iframeClosedAt: data.iframeClosedAt || undefined,
          totalTimeSpent: totalTimeSpent || undefined,
          interactionsCount: data.interactionsCount !== undefined 
            ? data.interactionsCount 
            : undefined,
        },
      });

      logger.info(`PrintNest session updated: ${sessionId}`);
      return updatedSession;
    } catch (error) {
      logger.error('Update session error:', error);
      throw error;
    }
  }

  // Increment interaction count
  async incrementInteraction(sessionId) {
    try {
      const session = await prisma.printNestSession.update({
        where: { sessionId },
        data: {
          interactionsCount: {
            increment: 1,
          },
        },
      });

      return session;
    } catch (error) {
      logger.error('Increment interaction error:', error);
      throw error;
    }
  }

  // Get user sessions
  async getUserSessions(userId, limit = 20) {
    try {
      const sessions = await prisma.printNestSession.findMany({
        where: { userId },
        orderBy: { iframeOpenedAt: 'desc' },
        take: limit,
      });

      return sessions;
    } catch (error) {
      logger.error('Get user sessions error:', error);
      throw error;
    }
  }

  // Get session stats for user
  async getUserSessionStats(userId) {
    try {
      const stats = await prisma.printNestSession.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { totalTimeSpent: true, interactionsCount: true },
      });

      return {
        totalSessions: stats._count.id || 0,
        totalTimeSpent: stats._sum.totalTimeSpent || 0,
        totalInteractions: stats._sum.interactionsCount || 0,
      };
    } catch (error) {
      logger.error('Get user session stats error:', error);
      throw error;
    }
  }

  // Get all sessions (admin)
  async getAllSessions(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const where = {};

      // Filter by user
      if (filters.userId) {
        where.userId = parseInt(filters.userId);
      }

      // Filter by date range
      if (filters.startDate || filters.endDate) {
        where.iframeOpenedAt = {};
        if (filters.startDate) {
          where.iframeOpenedAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.iframeOpenedAt.lte = new Date(filters.endDate);
        }
      }

      const [sessions, total] = await Promise.all([
        prisma.printNestSession.findMany({
          where,
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
          orderBy: { iframeOpenedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.printNestSession.count({ where }),
      ]);

      return {
        sessions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get all sessions error:', error);
      throw error;
    }
  }

  // Get overall stats (admin)
  async getOverallStats() {
    try {
      const [
        totalSessions,
        todaySessions,
        totalUsers,
        confirmedUsers,
      ] = await Promise.all([
        prisma.printNestSession.count(),
        prisma.printNestSession.count({
          where: {
            iframeOpenedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.user.count(),
        prisma.user.count({
          where: { printNestConfirmed: true },
        }),
      ]);

      return {
        totalSessions,
        todaySessions,
        totalUsers,
        confirmedUsers,
      };
    } catch (error) {
      logger.error('Get overall stats error:', error);
      throw error;
    }
  }
}

module.exports = new PrintNestService();


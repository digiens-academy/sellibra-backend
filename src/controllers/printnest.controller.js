const printNestService = require('../services/printnest.service');
const cacheService = require('../services/cache.service');
const { successResponse, errorResponse } = require('../utils/helpers');

class PrintNestController {
  // @route   POST /api/printnest/track-open
  // @desc    Track iframe open
  // @access  Private
  async trackOpen(req, res, next) {
    try {
      const userId = req.user.id;
      const { referrerPage } = req.body;

      const metadata = {
        userIp: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        referrerPage,
      };

      const session = await printNestService.createSession(userId, metadata);

      return successResponse(
        res,
        { sessionId: session.sessionId },
        'Session başlatıldı',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // @route   POST /api/printnest/track-close
  // @desc    Track iframe close
  // @access  Private
  async trackClose(req, res, next) {
    try {
      const { sessionId, timeSpent } = req.body;

      const session = await printNestService.updateSession(sessionId, {
        iframeClosedAt: new Date(),
        totalTimeSpent: timeSpent ? parseInt(timeSpent) : undefined,
      });

      // Session güncellendiğinde cache'i temizle
      await cacheService.deleteUserSessionsCache(req.user.id);

      return successResponse(res, { session }, 'Session kapatıldı');
    } catch (error) {
      if (error.message === 'Session bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   POST /api/printnest/track-interaction
  // @desc    Track user interaction with iframe
  // @access  Private
  async trackInteraction(req, res, next) {
    try {
      const { sessionId } = req.body;

      const session = await printNestService.incrementInteraction(sessionId);

      return successResponse(res, { interactionsCount: session.interactionsCount }, 'Interaction kaydedildi');
    } catch (error) {
      if (error.message === 'Session bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   GET /api/printnest/my-sessions
  // @desc    Get user's sessions
  // @access  Private
  async getMySessions(req, res, next) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      // Cache'den deneme
      const cacheKey = `${userId}_${limit}`;
      let cachedData = await cacheService.getUserSessionsCache(cacheKey);

      if (cachedData) {
        return successResponse(res, cachedData, 'Sessions retrieved (cached)');
      }

      // Cache'de yoksa DB'den çek
      const sessions = await printNestService.getUserSessions(userId, limit);
      const stats = await printNestService.getUserSessionStats(userId);

      const responseData = { sessions, stats };

      // Cache'e kaydet (30 dakika)
      await cacheService.setUserSessionsCache(cacheKey, responseData, 1800);

      return successResponse(res, responseData, 'Sessions retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PrintNestController();


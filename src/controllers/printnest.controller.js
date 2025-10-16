const printNestService = require('../services/printnest.service');
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

      const sessions = await printNestService.getUserSessions(userId, limit);
      const stats = await printNestService.getUserSessionStats(userId);

      return successResponse(res, { sessions, stats }, 'Sessions retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PrintNestController();


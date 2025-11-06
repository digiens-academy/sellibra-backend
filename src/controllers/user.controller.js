const userService = require('../services/user.service');
const printNestService = require('../services/printnest.service');
const { successResponse, errorResponse } = require('../utils/helpers');

class UserController {
  // @route   GET /api/users/profile
  // @desc    Get user profile
  // @access  Private
  async getProfile(req, res, next) {
    try {
      const user = await userService.getProfile(req.user.id);

      return successResponse(res, { user }, 'Profil bilgileri');
    } catch (error) {
      next(error);
    }
  }

  // @route   PUT /api/users/profile
  // @desc    Update user profile
  // @access  Private
  async updateProfile(req, res, next) {
    try {
      const { firstName, lastName, phoneNumber } = req.body;

      const user = await userService.updateProfile(req.user.id, {
        firstName,
        lastName,
        phoneNumber,
      });

      return successResponse(res, { user }, 'Profil güncellendi');
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/users/printnest-sessions
  // @desc    Get user's PrintNest sessions
  // @access  Private
  async getPrintNestSessions(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 20;

      const sessions = await printNestService.getUserSessions(req.user.id, limit);
      const stats = await printNestService.getUserSessionStats(req.user.id);

      return successResponse(res, { sessions, stats }, 'Sessions retrieved');
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/users/tokens
  // @desc    Get user's token information
  // @access  Private
  async getTokens(req, res, next) {
    try {
      const tokens = await userService.getUserTokens(req.user.id);

      return successResponse(res, { tokens }, 'Token bilgileri');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();


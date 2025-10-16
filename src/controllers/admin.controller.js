const adminService = require('../services/admin.service');
const printNestService = require('../services/printnest.service');
const googleSheetsService = require('../services/googleSheets.service');
const { successResponse, errorResponse } = require('../utils/helpers');

class AdminController {
  // @route   GET /api/admin/users
  // @desc    Get all users
  // @access  Private (Admin only)
  async getUsers(req, res, next) {
    try {
      const { search, printNestConfirmed, page = 1, limit = 20 } = req.query;

      const result = await adminService.getAllUsers(
        { search, printNestConfirmed },
        parseInt(page),
        parseInt(limit)
      );

      return successResponse(res, result, 'Users retrieved');
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/admin/users/:id
  // @desc    Get user by ID
  // @access  Private (Admin only)
  async getUserById(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      const user = await adminService.getUserById(userId);

      return successResponse(res, { user }, 'User retrieved');
    } catch (error) {
      if (error.message === 'Kullanıcı bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   PUT /api/admin/users/:id/confirm-printnest
  // @desc    Confirm PrintNest registration
  // @access  Private (Admin only)
  async confirmPrintNest(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      const user = await adminService.confirmPrintNestRegistration(userId);

      return successResponse(res, { user }, 'PrintNest kaydı onaylandı');
    } catch (error) {
      next(error);
    }
  }

  // @route   DELETE /api/admin/users/:id
  // @desc    Delete user
  // @access  Private (Admin only)
  async deleteUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      await adminService.deleteUser(userId);

      return successResponse(res, null, 'Kullanıcı silindi');
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/admin/printnest-sessions
  // @desc    Get all PrintNest sessions
  // @access  Private (Admin only)
  async getPrintNestSessions(req, res, next) {
    try {
      const { userId, startDate, endDate, page = 1, limit = 20 } = req.query;

      const result = await printNestService.getAllSessions(
        { userId, startDate, endDate },
        parseInt(page),
        parseInt(limit)
      );

      return successResponse(res, result, 'Sessions retrieved');
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/admin/stats
  // @desc    Get overall stats
  // @access  Private (Admin only)
  async getStats(req, res, next) {
    try {
      const stats = await printNestService.getOverallStats();

      return successResponse(res, { stats }, 'Stats retrieved');
    } catch (error) {
      next(error);
    }
  }

  // @route   POST /api/admin/sync-to-sheets
  // @desc    Manual sync to Google Sheets
  // @access  Private (Admin only)
  async syncToSheets(req, res, next) {
    try {
      const result = await googleSheetsService.syncAllUsers();

      if (result.success) {
        return successResponse(res, result, result.message);
      } else {
        return errorResponse(res, result.message, 500);
      }
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/admin/sync-logs
  // @desc    Get sync logs
  // @access  Private (Admin only)
  async getSyncLogs(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await adminService.getSyncLogs(parseInt(page), parseInt(limit));

      return successResponse(res, result, 'Sync logs retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();


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
      if (error.message === 'Super admin kullanıcısı silinemez') {
        return errorResponse(res, error.message, 403);
      }
      if (error.message === 'Kullanıcı bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   PUT /api/admin/users/:id/role
  // @desc    Update user role
  // @access  Private (Admin only)
  async updateUserRole(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;

      if (!role || !['user', 'admin'].includes(role)) {
        return errorResponse(res, 'Geçersiz rol. Sadece "user" veya "admin" olabilir', 400);
      }

      const user = await adminService.updateUserRole(userId, role);

      return successResponse(res, { user }, 'Kullanıcı rolü güncellendi');
    } catch (error) {
      next(error);
    }
  }

  // @route   PUT /api/admin/users/:id/tokens
  // @desc    Update user tokens
  // @access  Private (Admin only)
  async updateUserTokens(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const { dailyTokens } = req.body;

      if (dailyTokens === undefined || dailyTokens < 0) {
        return errorResponse(res, 'Geçersiz token miktarı', 400);
      }

      const user = await adminService.updateUserTokens(userId, parseInt(dailyTokens));

      return successResponse(res, { user }, 'Kullanıcı tokenleri güncellendi');
    } catch (error) {
      next(error);
    }
  }

  // @route   POST /api/admin/users/:id/reset-tokens
  // @desc    Reset user tokens to default
  // @access  Private (Admin only)
  async resetUserTokens(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      const user = await adminService.resetUserTokens(userId);

      return successResponse(res, { user }, 'Kullanıcı tokenleri sıfırlandı');
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

  // @route   POST /api/admin/sheets-webhook
  // @desc    Handle Google Sheets updates (webhook from Apps Script)
  // @access  Public (but protected with secret token)
  async handleSheetsWebhook(req, res, next) {
    try {
      const config = require('../config/env');
      
      // Validate webhook secret
      const providedSecret = req.headers['x-webhook-secret'];
      
      if (config.sheetsWebhookSecret && providedSecret !== config.sheetsWebhookSecret) {
        return errorResponse(res, 'Invalid webhook secret', 401);
      }

      // Get row data from request body
      const rowData = req.body;

      // Process the update
      const result = await googleSheetsService.processSheetUpdate(rowData);

      if (result.success) {
        return successResponse(res, result, result.message);
      } else {
        return errorResponse(res, result.message, 400);
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();


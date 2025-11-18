const announcementService = require('../services/announcement.service');
const { successResponse, errorResponse } = require('../utils/helpers');

class AnnouncementController {
  // @route   POST /api/admin/announcements
  // @desc    Create new announcement
  // @access  Private (Admin only)
  async createAnnouncement(req, res, next) {
    try {
      const { title, content, isActive, priority, type, startDate, endDate } = req.body;

      // Validation
      if (!title || !content) {
        return errorResponse(res, 'Başlık ve içerik zorunludur', 400);
      }

      if (priority && !['low', 'normal', 'high'].includes(priority)) {
        return errorResponse(res, 'Geçersiz öncelik değeri', 400);
      }

      if (type && !['info', 'success', 'warning', 'error'].includes(type)) {
        return errorResponse(res, 'Geçersiz duyuru tipi', 400);
      }

      const announcement = await announcementService.createAnnouncement(
        { title, content, isActive, priority, type, startDate, endDate },
        req.user.id
      );

      return successResponse(res, { announcement }, 'Duyuru oluşturuldu', 201);
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/admin/announcements
  // @desc    Get all announcements (for admin)
  // @access  Private (Admin only)
  async getAllAnnouncements(req, res, next) {
    try {
      const { isActive, type, priority, search, page = 1, limit = 20 } = req.query;

      const result = await announcementService.getAllAnnouncements(
        { isActive, type, priority, search },
        parseInt(page),
        parseInt(limit)
      );

      return successResponse(res, result, 'Duyurular getirildi');
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/announcements/active
  // @desc    Get active announcements (for users)
  // @access  Public
  async getActiveAnnouncements(req, res, next) {
    try {
      const announcements = await announcementService.getActiveAnnouncements();

      return successResponse(res, { announcements }, 'Aktif duyurular getirildi');
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/admin/announcements/:id
  // @desc    Get announcement by ID
  // @access  Private (Admin only)
  async getAnnouncementById(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return errorResponse(res, 'Geçersiz duyuru ID', 400);
      }

      const announcement = await announcementService.getAnnouncementById(id);

      return successResponse(res, { announcement }, 'Duyuru getirildi');
    } catch (error) {
      if (error.message === 'Duyuru bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   PUT /api/admin/announcements/:id
  // @desc    Update announcement
  // @access  Private (Admin only)
  async updateAnnouncement(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return errorResponse(res, 'Geçersiz duyuru ID', 400);
      }

      const { title, content, isActive, priority, type, startDate, endDate } = req.body;

      if (priority && !['low', 'normal', 'high'].includes(priority)) {
        return errorResponse(res, 'Geçersiz öncelik değeri', 400);
      }

      if (type && !['info', 'success', 'warning', 'error'].includes(type)) {
        return errorResponse(res, 'Geçersiz duyuru tipi', 400);
      }

      const announcement = await announcementService.updateAnnouncement(id, {
        title,
        content,
        isActive,
        priority,
        type,
        startDate,
        endDate,
      });

      return successResponse(res, { announcement }, 'Duyuru güncellendi');
    } catch (error) {
      if (error.message === 'Duyuru bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   PATCH /api/admin/announcements/:id/toggle
  // @desc    Toggle announcement status
  // @access  Private (Admin only)
  async toggleAnnouncementStatus(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return errorResponse(res, 'Geçersiz duyuru ID', 400);
      }

      const announcement = await announcementService.toggleAnnouncementStatus(id);

      return successResponse(
        res,
        { announcement },
        `Duyuru ${announcement.isActive ? 'aktif' : 'pasif'} yapıldı`
      );
    } catch (error) {
      if (error.message === 'Duyuru bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   DELETE /api/admin/announcements/:id
  // @desc    Delete announcement
  // @access  Private (Admin only)
  async deleteAnnouncement(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return errorResponse(res, 'Geçersiz duyuru ID', 400);
      }

      await announcementService.deleteAnnouncement(id);

      return successResponse(res, null, 'Duyuru silindi');
    } catch (error) {
      if (error.message === 'Duyuru bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   GET /api/admin/announcements/stats
  // @desc    Get announcement stats
  // @access  Private (Admin only)
  async getAnnouncementStats(req, res, next) {
    try {
      const stats = await announcementService.getAnnouncementStats();

      return successResponse(res, { stats }, 'Duyuru istatistikleri getirildi');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnnouncementController();


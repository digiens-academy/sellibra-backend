const announcementService = require('../services/announcement.service');
const { successResponse, errorResponse } = require('../utils/helpers');

class AnnouncementController {
  // @route   GET /api/announcements/active
  // @desc    Get active announcements (public - kullanıcılar için)
  // @access  Private
  async getActiveAnnouncements(req, res, next) {
    try {
      const announcements = await announcementService.getActiveAnnouncements();
      return successResponse(res, { announcements }, 'Aktif bildirimler getirildi');
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/announcements
  // @desc    Get all announcements (admin/support paneli için)
  // @access  Private (Admin or Support)
  async getAllAnnouncements(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await announcementService.getAllAnnouncements(
        parseInt(page),
        parseInt(limit)
      );
      return successResponse(res, result, 'Tüm bildirimler getirildi');
    } catch (error) {
      next(error);
    }
  }

  // @route   GET /api/announcements/:id
  // @desc    Get announcement by ID
  // @access  Private (Admin or Support)
  async getAnnouncementById(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const announcement = await announcementService.getAnnouncementById(id);
      return successResponse(res, { announcement }, 'Bildirim getirildi');
    } catch (error) {
      if (error.message === 'Bildirim bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   POST /api/announcements
  // @desc    Create new announcement
  // @access  Private (Admin or Support)
  async createAnnouncement(req, res, next) {
    try {
      const { title, message, type, startDate, endDate, isActive } = req.body;

      // Validasyon
      if (!title || !message || !startDate || !endDate) {
        return errorResponse(res, 'Başlık, mesaj, başlangıç ve bitiş tarihi gereklidir', 400);
      }

      const data = { title, message, type, startDate, endDate, isActive };
      const announcement = await announcementService.createAnnouncement(data, req.user.id);

      return successResponse(res, { announcement }, 'Bildirim oluşturuldu', 201);
    } catch (error) {
      if (error.message === 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır') {
        return errorResponse(res, error.message, 400);
      }
      next(error);
    }
  }

  // @route   PUT /api/announcements/:id
  // @desc    Update announcement
  // @access  Private (Admin or Support)
  async updateAnnouncement(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const { title, message, type, startDate, endDate, isActive } = req.body;

      const data = { title, message, type, startDate, endDate, isActive };
      const announcement = await announcementService.updateAnnouncement(id, data);

      return successResponse(res, { announcement }, 'Bildirim güncellendi');
    } catch (error) {
      if (error.message === 'Bildirim bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      if (error.message === 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır') {
        return errorResponse(res, error.message, 400);
      }
      next(error);
    }
  }

  // @route   PUT /api/announcements/:id/deactivate
  // @desc    Deactivate announcement (yayından kaldır)
  // @access  Private (Admin or Support)
  async deactivateAnnouncement(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const announcement = await announcementService.deactivateAnnouncement(id);
      return successResponse(res, { announcement }, 'Bildirim yayından kaldırıldı');
    } catch (error) {
      next(error);
    }
  }

  // @route   PUT /api/announcements/:id/activate
  // @desc    Activate announcement (yayına al)
  // @access  Private (Admin or Support)
  async activateAnnouncement(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const announcement = await announcementService.activateAnnouncement(id);
      return successResponse(res, { announcement }, 'Bildirim yayına alındı');
    } catch (error) {
      next(error);
    }
  }

  // @route   DELETE /api/announcements/:id
  // @desc    Delete announcement
  // @access  Private (Admin or Support)
  async deleteAnnouncement(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      await announcementService.deleteAnnouncement(id);
      return successResponse(res, null, 'Bildirim silindi');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnnouncementController();


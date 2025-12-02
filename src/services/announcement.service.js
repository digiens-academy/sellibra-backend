const { prisma } = require('../config/database');
const logger = require('../utils/logger');

class AnnouncementService {
  // Aktif bildirimleri getir (tarih aralığına göre)
  async getActiveAnnouncements() {
    try {
      const now = new Date();
      
      const announcements = await prisma.announcement.findMany({
        where: {
          isActive: true,
          startDate: {
            lte: now
          },
          endDate: {
            gte: now
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return announcements;
    } catch (error) {
      logger.error('Get active announcements error:', error);
      throw error;
    }
  }

  // Tüm bildirimleri getir (Admin/Support paneli için)
  async getAllAnnouncements(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.announcement.count()
      ]);

      return {
        announcements,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };
    } catch (error) {
      logger.error('Get all announcements error:', error);
      throw error;
    }
  }

  // ID'ye göre bildirim getir
  async getAnnouncementById(id) {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!announcement) {
        throw new Error('Bildirim bulunamadı');
      }

      return announcement;
    } catch (error) {
      logger.error('Get announcement by ID error:', error);
      throw error;
    }
  }

  // Yeni bildirim oluştur
  async createAnnouncement(data, createdBy) {
    try {
      const { title, message, type = 'info', startDate, endDate, isActive = true } = data;

      // Tarih kontrolü
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end <= start) {
        throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      }

      const announcement = await prisma.announcement.create({
        data: {
          title,
          message,
          type,
          startDate: start,
          endDate: end,
          isActive,
          createdBy
        }
      });

      logger.info(`Announcement created: ${announcement.id} by user ${createdBy}`);
      return announcement;
    } catch (error) {
      logger.error('Create announcement error:', error);
      throw error;
    }
  }

  // Bildirimi güncelle
  async updateAnnouncement(id, data) {
    try {
      // Mevcut bildirimi kontrol et
      const existing = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new Error('Bildirim bulunamadı');
      }

      const { title, message, type, startDate, endDate, isActive } = data;

      // Tarih kontrolü (eğer güncelleniyorsa)
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
          throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
        }
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (message !== undefined) updateData.message = message;
      if (type !== undefined) updateData.type = type;
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (isActive !== undefined) updateData.isActive = isActive;

      const announcement = await prisma.announcement.update({
        where: { id },
        data: updateData
      });

      logger.info(`Announcement updated: ${id}`);
      return announcement;
    } catch (error) {
      logger.error('Update announcement error:', error);
      throw error;
    }
  }

  // Bildirimi yayından kaldır (soft delete)
  async deactivateAnnouncement(id) {
    try {
      const announcement = await prisma.announcement.update({
        where: { id },
        data: { isActive: false }
      });

      logger.info(`Announcement deactivated: ${id}`);
      return announcement;
    } catch (error) {
      logger.error('Deactivate announcement error:', error);
      throw error;
    }
  }

  // Bildirimi yayına al
  async activateAnnouncement(id) {
    try {
      const announcement = await prisma.announcement.update({
        where: { id },
        data: { isActive: true }
      });

      logger.info(`Announcement activated: ${id}`);
      return announcement;
    } catch (error) {
      logger.error('Activate announcement error:', error);
      throw error;
    }
  }

  // Bildirimi sil
  async deleteAnnouncement(id) {
    try {
      await prisma.announcement.delete({
        where: { id }
      });

      logger.info(`Announcement deleted: ${id}`);
    } catch (error) {
      logger.error('Delete announcement error:', error);
      throw error;
    }
  }
}

module.exports = new AnnouncementService();


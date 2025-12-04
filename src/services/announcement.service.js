const { prisma } = require('../config/database');
const logger = require('../utils/logger');

class AnnouncementService {
  // Kullanıcının hedef kitle kurallarına uyup uymadığını kontrol et
  _checkTargetAudience(announcement, user) {
    // targetAudience null ise herkese göster
    if (!announcement.targetAudience) {
      return true;
    }

    const target = announcement.targetAudience;

    // Role bazlı filtreleme
    if (target.roles && target.roles.length > 0) {
      if (!target.roles.includes(user.role)) {
        return false;
      }
    }

    // Premium üyelik kontrolü
    if (target.hasActiveSubscription !== undefined) {
      if (user.hasActiveSubscription !== target.hasActiveSubscription) {
        return false;
      }
    }

    // PrintNest onay durumu kontrolü
    if (target.printNestConfirmed !== undefined) {
      if (user.printNestConfirmed !== target.printNestConfirmed) {
        return false;
      }
    }

    // Etsy mağaza kontrolü (etsyStores array'i veya etsyStoreUrl field'ı)
    if (target.hasEtsyStore !== undefined) {
      // Önce etsyStores array'ini kontrol et (relation varsa)
      let userHasStore = false;
      
      if (user.etsyStores && Array.isArray(user.etsyStores)) {
        userHasStore = user.etsyStores.length > 0;
      } else if (user.etsyStoreUrl) {
        // Fallback: etsyStoreUrl field'ını kontrol et
        userHasStore = user.etsyStoreUrl.trim() !== '';
      }
      
      if (userHasStore !== target.hasEtsyStore) {
        return false;
      }
    }

    // Tüm koşullar sağlandı
    return true;
  }

  // Aktif bildirimleri getir (kullanıcıya özel - hedef kitle filtreli)
  async getActiveAnnouncements(user) {
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

      // Kullanıcı bilgisi varsa hedef kitle filtrelemesi yap
      if (user) {
        // Kullanıcının tam bilgilerini DB'den çek (etsyStores relation ile)
        const fullUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            etsyStores: true
          }
        });

        if (!fullUser) {
          logger.warn(`User ${user.id} not found in database`);
          return announcements.filter(announcement => !announcement.targetAudience);
        }

        return announcements.filter(announcement => 
          this._checkTargetAudience(announcement, fullUser)
        );
      }

      // Kullanıcı bilgisi yoksa sadece genel bildirimleri döndür (targetAudience null olanlar)
      return announcements.filter(announcement => !announcement.targetAudience);
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
      const { title, message, type = 'info', startDate, endDate, isActive = true, targetAudience } = data;

      // Tarih kontrolü
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end <= start) {
        throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      }

      // targetAudience validasyonu
      if (targetAudience && typeof targetAudience !== 'object') {
        throw new Error('targetAudience bir JSON objesi olmalıdır');
      }

      const announcement = await prisma.announcement.create({
        data: {
          title,
          message,
          type,
          startDate: start,
          endDate: end,
          isActive,
          createdBy,
          targetAudience: targetAudience || null
        }
      });

      logger.info(`Announcement created: ${announcement.id} by user ${createdBy}`, {
        targetAudience: targetAudience || 'all users'
      });
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

      const { title, message, type, startDate, endDate, isActive, targetAudience } = data;

      // Tarih kontrolü (eğer güncelleniyorsa)
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
          throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
        }
      }

      // targetAudience validasyonu
      if (targetAudience !== undefined && targetAudience !== null && typeof targetAudience !== 'object') {
        throw new Error('targetAudience bir JSON objesi olmalıdır');
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (message !== undefined) updateData.message = message;
      if (type !== undefined) updateData.type = type;
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (isActive !== undefined) updateData.isActive = isActive;
      if (targetAudience !== undefined) updateData.targetAudience = targetAudience;

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


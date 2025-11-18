const { prisma } = require('../config/database');

class AnnouncementService {
  /**
   * Create new announcement
   */
  async createAnnouncement(data, createdBy) {
    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        isActive: data.isActive !== undefined ? data.isActive : true,
        priority: data.priority || 'normal',
        type: data.type || 'info',
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdBy,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return announcement;
  }

  /**
   * Get all announcements (for admin)
   */
  async getAllAnnouncements(filters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {};

    // Filter by active status (only if explicitly set and not empty string)
    if (filters.isActive !== undefined && filters.isActive !== '') {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    // Filter by type (only if not empty string)
    if (filters.type && filters.type.trim() !== '') {
      where.type = filters.type;
    }

    // Filter by priority (only if not empty string)
    if (filters.priority && filters.priority.trim() !== '') {
      where.priority = filters.priority;
    }

    // Search in title or content (only if not empty string)
    if (filters.search && filters.search.trim() !== '') {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' }, // high, normal, low
          { createdAt: 'desc' },
        ],
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return {
      announcements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get active announcements (for users)
   */
  async getActiveAnnouncements() {
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: now } },
              { endDate: { gte: now } },
            ],
          },
          {
            AND: [
              { startDate: { lte: now } },
              { endDate: null },
            ],
          },
          {
            AND: [
              { startDate: null },
              { endDate: { gte: now } },
            ],
          },
          {
            AND: [
              { startDate: null },
              { endDate: null },
            ],
          },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        priority: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    });

    return announcements;
  }

  /**
   * Get announcement by ID
   */
  async getAnnouncementById(id) {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new Error('Duyuru bulunamadı');
    }

    return announcement;
  }

  /**
   * Update announcement
   */
  async updateAnnouncement(id, data) {
    // Check if announcement exists
    await this.getAnnouncementById(id);

    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return announcement;
  }

  /**
   * Toggle announcement status
   */
  async toggleAnnouncementStatus(id) {
    const announcement = await this.getAnnouncementById(id);

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        isActive: !announcement.isActive,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete announcement
   */
  async deleteAnnouncement(id) {
    // Check if announcement exists
    await this.getAnnouncementById(id);

    await prisma.announcement.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Get announcement stats
   */
  async getAnnouncementStats() {
    const [total, active, inactive, byType, byPriority] = await Promise.all([
      prisma.announcement.count(),
      prisma.announcement.count({ where: { isActive: true } }),
      prisma.announcement.count({ where: { isActive: false } }),
      prisma.announcement.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.announcement.groupBy({
        by: ['priority'],
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      inactive,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count;
        return acc;
      }, {}),
    };
  }
}

module.exports = new AnnouncementService();


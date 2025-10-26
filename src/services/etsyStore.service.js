const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const googleSheetsService = require('./googleSheets.service');

class EtsyStoreService {
  // Get all stores for a user
  async getUserStores(userId) {
    try {
      const stores = await prisma.etsyStore.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      return stores;
    } catch (error) {
      logger.error('Error getting user stores:', error.message);
      throw error;
    }
  }

  // Add new store
  async addStore(userId, storeData) {
    try {
      const { storeUrl, storeName } = storeData;

      // Check if store already exists for this user
      const existingStore = await prisma.etsyStore.findFirst({
        where: {
          userId,
          storeUrl,
        },
      });

      if (existingStore) {
        throw new Error('Bu mağaza zaten ekli');
      }

      // Create store
      const store = await prisma.etsyStore.create({
        data: {
          userId,
          storeUrl,
          storeName: storeName || null,
        },
      });

      logger.info(`✅ Etsy store added for user ${userId}: ${storeUrl}`);

      // Sync to Google Sheets
      await this.syncStoresToSheets(userId);

      return store;
    } catch (error) {
      logger.error('Error adding store:', error.message);
      throw error;
    }
  }

  // Update store
  async updateStore(storeId, userId, storeData) {
    try {
      const { storeUrl, storeName } = storeData;

      // Check if store belongs to user
      const store = await prisma.etsyStore.findFirst({
        where: {
          id: storeId,
          userId,
        },
      });

      if (!store) {
        throw new Error('Mağaza bulunamadı');
      }

      // Update store
      const updatedStore = await prisma.etsyStore.update({
        where: { id: storeId },
        data: {
          storeUrl: storeUrl || store.storeUrl,
          storeName: storeName !== undefined ? storeName : store.storeName,
        },
      });

      logger.info(`✅ Etsy store updated: ${storeId}`);

      // Sync to Google Sheets
      await this.syncStoresToSheets(userId);

      return updatedStore;
    } catch (error) {
      logger.error('Error updating store:', error.message);
      throw error;
    }
  }

  // Delete store
  async deleteStore(storeId, userId) {
    try {
      // Check if store belongs to user
      const store = await prisma.etsyStore.findFirst({
        where: {
          id: storeId,
          userId,
        },
      });

      if (!store) {
        throw new Error('Mağaza bulunamadı');
      }

      // Delete store
      await prisma.etsyStore.delete({
        where: { id: storeId },
      });

      logger.info(`✅ Etsy store deleted: ${storeId}`);

      // Sync to Google Sheets
      await this.syncStoresToSheets(userId);

      return { message: 'Mağaza silindi' };
    } catch (error) {
      logger.error('Error deleting store:', error.message);
      throw error;
    }
  }

  // Sync stores to Google Sheets
  async syncStoresToSheets(userId) {
    try {
      // Get user with stores
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          etsyStores: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Format store URLs for sheets (comma separated)
      const storeUrls = user.etsyStores.map(store => store.storeUrl).join(', ') || '-';

      // Update in Google Sheets
      await googleSheetsService.updateUserInSheet(user.email, {
        etsyStoreUrl: storeUrls,
      });

      logger.info(`✅ Synced ${user.etsyStores.length} stores to Google Sheets for user ${userId}`);
    } catch (error) {
      logger.warn('⚠️ Failed to sync stores to Google Sheets:', error.message);
      // Don't throw error, just log warning
    }
  }
}

module.exports = new EtsyStoreService();


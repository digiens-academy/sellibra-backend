const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const etsyAnalyticsService = require('../services/etsyAnalytics.service');
const logger = require('../utils/logger');

/**
 * Sync analytics for all connected Etsy stores
 * Runs in batches to avoid rate limiting
 */
const syncAllStoresAnalytics = async () => {
  try {
    logger.info('🔄 Starting daily analytics sync for all stores...');

    // Get all connected stores
    const stores = await prisma.etsyStore.findMany({
      where: {
        isConnected: true,
        shopId: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            hasActiveSubscription: true,
          },
        },
      },
    });

    if (stores.length === 0) {
      logger.info('ℹ️  No connected stores found to sync');
      return { success: true, synced: 0, total: 0 };
    }

    logger.info(`📊 Found ${stores.length} connected stores to sync`);

    let syncedCount = 0;
    let failedCount = 0;
    const batchSize = 5; // Process 5 stores at a time to avoid rate limits

    // Process in batches
    for (let i = 0; i < stores.length; i += batchSize) {
      const batch = stores.slice(i, i + batchSize);
      
      logger.info(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stores.length / batchSize)} (${batch.length} stores)`);

      const batchPromises = batch.map(async (store) => {
        try {
          logger.info(`🔄 Syncing store ${store.id} (${store.storeName || store.shopId}) for user ${store.user.email}`);
          
          await etsyAnalyticsService.syncShopAnalytics(
            store.userId,
            store.id,
            false // Don't force refresh - respect 24h cache
          );

          syncedCount++;
          logger.info(`✅ Successfully synced store ${store.id}`);
        } catch (error) {
          failedCount++;
          logger.error(`❌ Failed to sync store ${store.id}:`, error.message);
        }
      });

      await Promise.allSettled(batchPromises);

      // Wait 2 seconds between batches to avoid rate limiting
      if (i + batchSize < stores.length) {
        logger.info('⏸️  Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    logger.info(`✅ Daily analytics sync completed: ${syncedCount} synced, ${failedCount} failed out of ${stores.length} total`);

    return {
      success: true,
      synced: syncedCount,
      failed: failedCount,
      total: stores.length,
    };
  } catch (error) {
    logger.error('❌ Error in daily analytics sync:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Initialize daily analytics sync cron job
 * Runs every day at 2 AM (low traffic time)
 */
const initializeAnalyticsSyncJob = () => {
  // Run every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('⏰ Scheduled daily analytics sync starting...');
    await syncAllStoresAnalytics();
  });

  // Also run on server startup after 2 minutes (for testing/recovery)
  setTimeout(async () => {
    logger.info('🚀 Running initial analytics sync on server startup...');
    await syncAllStoresAnalytics();
  }, 2 * 60 * 1000); // 2 minutes after startup

  logger.info('✅ Analytics sync cron job initialized (runs daily at 2 AM)');
};

module.exports = {
  syncAllStoresAnalytics,
  initializeAnalyticsSyncJob,
};

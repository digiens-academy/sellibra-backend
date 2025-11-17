const { createQueue, createWorker, queues } = require('../config/queue');
const googleSheetsService = require('../services/googleSheets.service');
const logger = require('../utils/logger');

// Initialize Google Sheets sync queue (will be null if Redis is not available)
try {
  queues.googleSheetsSync = createQueue('google-sheets-sync');
  if (!queues.googleSheetsSync) {
    logger.warn('⚠️  Google Sheets sync queue could not be initialized - Redis connection may be unavailable');
    logger.warn('⚠️  Google Sheets sync will use direct processing (fallback mode)');
  }
} catch (error) {
  logger.error('Failed to initialize Google Sheets sync queue:', error.message);
  logger.warn('⚠️  Google Sheets sync will use direct processing (fallback mode)');
}

/**
 * Google Sheets Sync Worker
 * Handles async Google Sheets synchronization operations (only if queue is available)
 */
const sheetsSyncWorker = queues.googleSheetsSync ? createWorker(
  'google-sheets-sync',
  async (job) => {
    const { type, data } = job.data;

    try {
      switch (type) {
        case 'append-user':
          // Append new user to Google Sheets
          return await googleSheetsService.appendUserToSheet(data.user);
        
        case 'update-user':
          // Update user in Google Sheets
          return await googleSheetsService.updateUserInSheet(data.email, data.updates);
        
        case 'mark-printnest-confirmed':
          // Mark user as PrintNest confirmed
          return await googleSheetsService.markUserAsPrintNestConfirmed(data.email, data.userId);
        
        case 'sync-all':
          // Sync all users (manual sync)
          return await googleSheetsService.syncAllUsers();
        
        default:
          throw new Error(`Unknown sync type: ${type}`);
      }
    } catch (error) {
      logger.error(`Google Sheets sync error for type ${type}:`, error);
      throw error;
    }
  },
  {
    concurrency: 3, // Process 3 sync jobs concurrently
  }
) : null;

if (sheetsSyncWorker) {
  logger.info('✅ Google Sheets sync worker initialized');
} else {
  logger.warn('⚠️  Google Sheets sync worker not initialized - Redis connection required');
  logger.warn('⚠️  Google Sheets sync will use direct processing (fallback mode)');
}

module.exports = {
  sheetsSyncWorker,
};


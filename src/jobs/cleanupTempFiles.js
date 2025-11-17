const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('../config/upload');
const logger = require('../utils/logger');

/**
 * Cleanup temporary files older than 1 hour
 */
const cleanupTempFiles = async () => {
  try {
    if (!fs.existsSync(tempDir)) {
      return;
    }

    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000); // 1 hour in milliseconds
    let deletedCount = 0;
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      
      try {
        const stats = fs.statSync(filePath);
        
        // Delete files older than 1 hour
        if (stats.mtimeMs < oneHourAgo) {
          const fileSize = stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
          totalSize += fileSize;
          logger.debug(`Deleted old temp file: ${file}`);
        }
      } catch (error) {
        // File might have been deleted already or permission issue
        logger.warn(`Error processing temp file ${file}:`, error.message);
      }
    }

    if (deletedCount > 0) {
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      logger.info(`Cleanup completed: ${deletedCount} files deleted (${sizeInMB} MB freed)`);
    }
  } catch (error) {
    logger.error('Error during temp file cleanup:', error);
  }
};

/**
 * Initialize cleanup cron job
 * Runs every hour to clean up temporary files
 */
const initializeCleanupJob = () => {
  // Run cleanup every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    logger.info('Starting scheduled temp file cleanup...');
    await cleanupTempFiles();
  });

  // Also run cleanup on startup (after 5 minutes)
  setTimeout(async () => {
    logger.info('Running initial temp file cleanup...');
    await cleanupTempFiles();
  }, 5 * 60 * 1000); // 5 minutes

  logger.info('✅ Temp file cleanup cron job initialized (runs every hour)');
};

module.exports = {
  cleanupTempFiles,
  initializeCleanupJob,
};


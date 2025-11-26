const cron = require('node-cron');
const googleSheetsService = require('../services/googleSheets.service');
const logger = require('../utils/logger');

// Cron job to sync PrintNest confirmation status from Google Sheets (J column)
// J sütunundaki DEPO İNDİRİM TANIMLADI bilgisine göre printnest_confirmed güncellenir
// Runs every 5 minutes
const syncPrintNestConfirmationJob = cron.schedule('*/5 * * * *', async () => {
  try {
    logger.info('🔄 Starting scheduled PrintNest confirmation sync from Google Sheets J column...');
    
    const result = await googleSheetsService.syncPrintNestConfirmationFromSheet();
    
    if (result.success) {
      logger.info(`✅ PrintNest confirmation sync completed: ${result.message}`);
    } else {
      logger.error(`❌ PrintNest confirmation sync failed: ${result.message}`);
    }
  } catch (error) {
    logger.error('❌ Error in PrintNest confirmation sync cron job:', error.message);
  }
}, {
  scheduled: false, // Start manually
  timezone: "Europe/Istanbul"
});

module.exports = syncPrintNestConfirmationJob;


const cron = require('node-cron');
const googleSheetsService = require('../services/googleSheets.service');
const logger = require('../utils/logger');

/**
 * Google Sheets'ten PrintNest onay durumlarını senkronize et
 * J sütunu (DEPO İNDİRİM UYGULADI) "EVET" ise database'de printNestConfirmed = true
 */
const syncSheetToDB = async () => {
  try {
    logger.info('🔄 Google Sheets PrintNest onay senkronizasyonu başlatılıyor...');
    
    const result = await googleSheetsService.syncPrintNestConfirmationsFromSheet();
    
    if (result.success) {
      logger.info(`✅ Senkronizasyon başarılı: ${result.message}`);
      if (result.updated > 0) {
        logger.info(`📊 ${result.updated} kullanıcı güncellendi`);
      }
    } else {
      logger.error(`❌ Senkronizasyon başarısız: ${result.message}`);
    }

    return result;
  } catch (error) {
    logger.error('❌ Sheet senkronizasyonu sırasında hata:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Cron job'ı başlat
 * Her 5 dakikada bir çalışır
 */
const initializeSheetSyncJob = () => {
  // Her 5 dakikada bir çalıştır
  cron.schedule('*/5 * * * *', async () => {
    logger.info('⏰ Zamanlanmış Sheet senkronizasyonu başlatılıyor...');
    await syncSheetToDB();
  });

  // Başlangıçta 1 dakika sonra ilk çalıştırmayı yap
  setTimeout(async () => {
    logger.info('🚀 İlk Sheet senkronizasyonu başlatılıyor...');
    await syncSheetToDB();
  }, 60 * 1000); // 1 dakika

  logger.info('✅ Sheet senkronizasyon cron job\'ı başlatıldı (her 5 dakikada bir çalışır)');
};

module.exports = {
  syncSheetToDB,
  initializeSheetSyncJob,
};


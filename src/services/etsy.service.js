const logger = require('../utils/logger');

class EtsyService {
  // NOT: Mağaza doğrulama fonksiyonu kaldırıldı
  // Etsy'nin bot koruması nedeniyle HTTP kontrolü yapılamadığı için
  // sadece URL normalize ve shop name çıkarma fonksiyonları kullanılıyor

  /**
   * Etsy URL'sini normalize et ve doğrula
   * @param {string} url - Normalize edilecek URL
   * @returns {string|null} - Normalize edilmiş URL veya null
   */
  normalizeEtsyUrl(url) {
    if (!url) return null;

    try {
      // URL'den boşlukları temizle
      url = url.trim();

      // Etsy shop adını çıkar
      let shopName = null;

      // Farklı Etsy URL formatlarını destekle
      const patterns = [
        /etsy\.com\/shop\/([a-zA-Z0-9_-]+)/i,
        /www\.etsy\.com\/shop\/([a-zA-Z0-9_-]+)/i,
        /^([a-zA-Z0-9_-]+)$/, // Sadece shop adı
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          shopName = match[1];
          break;
        }
      }

      if (!shopName) {
        return null;
      }

      // Standart Etsy shop URL'si oluştur
      return `https://www.etsy.com/shop/${shopName}`;
    } catch (error) {
      logger.error('URL normalize hatası:', error);
      return null;
    }
  }

  /**
   * Etsy shop adını URL'den çıkar
   * @param {string} url - Etsy mağaza URL'si
   * @returns {string|null} - Shop adı
   */
  extractShopName(url) {
    const normalizedUrl = this.normalizeEtsyUrl(url);
    if (!normalizedUrl) return null;

    const match = normalizedUrl.match(/shop\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : null;
  }
}

module.exports = new EtsyService();


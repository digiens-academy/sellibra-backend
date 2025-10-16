const aiService = require('../services/ai.service');
const userService = require('../services/user.service');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class AIController {
  /**
   * @route   POST /api/ai/remove-background
   * @desc    Görselin arka planını kaldır
   * @access  Private
   */
  async removeBackground(req, res, next) {
    let uploadedFilePath = null;

    try {
      // Token kontrolü - Tasarım işlemi: 4 token
      const hasTokens = await userService.hasEnoughTokens(req.user.id, 4);
      if (!hasTokens) {
        return errorResponse(res, 'Yetersiz token. Günlük token limitinize ulaştınız.', 403);
      }

      // Dosya yüklendi mi kontrol et
      if (!req.file) {
        return errorResponse(res, 'Lütfen bir görsel yükleyin', 400);
      }

      uploadedFilePath = req.file.path;
      logger.info(`Arka plan kaldırma isteği: ${req.file.filename}`);

      // Arka planı kaldır
      const processedImageBuffer = await aiService.removeBackground(uploadedFilePath);

      // Token tüket
      const tokenResult = await userService.consumeTokens(req.user.id, 4);

      // Geçici dosyayı sil
      await aiService.cleanupTempFiles([uploadedFilePath]);

      // İşlenmiş görseli base64 olarak döndür
      const base64Image = processedImageBuffer.toString('base64');

      return successResponse(
        res,
        {
          image: `data:image/png;base64,${base64Image}`,
          filename: `removed-bg-${req.file.filename}.png`,
          remainingTokens: tokenResult.remainingTokens
        },
        'Arka plan başarıyla kaldırıldı'
      );

    } catch (error) {
      // Hata durumunda geçici dosyayı sil
      if (uploadedFilePath) {
        await aiService.cleanupTempFiles([uploadedFilePath]);
      }

      logger.error('Remove background error:', error);
      
      if (error.message.includes('API key')) {
        return errorResponse(res, 'AI servisi yapılandırması eksik. Lütfen yönetici ile iletişime geçin.', 503);
      }

      if (error.message.includes('Yetersiz token')) {
        return errorResponse(res, error.message, 403);
      }

      next(error);
    }
  }

  /**
   * @route   POST /api/ai/text-to-image
   * @desc    Metinden görsel oluştur
   * @access  Private
   */
  async textToImage(req, res, next) {
    try {
      // Token kontrolü - Tasarım işlemi: 4 token
      const hasTokens = await userService.hasEnoughTokens(req.user.id, 4);
      if (!hasTokens) {
        return errorResponse(res, 'Yetersiz token. Günlük token limitinize ulaştınız.', 403);
      }

      const { prompt, size, quality, style } = req.body;

      if (!prompt) {
        return errorResponse(res, 'Lütfen bir açıklama girin', 400);
      }

      logger.info(`Text-to-Image isteği: ${prompt}`);

      const result = await aiService.textToImage(prompt, {
        size: size || '1024x1024',
        quality: quality || 'standard',
        style: style || 'vivid'
      });

      // Token tüket
      const tokenResult = await userService.consumeTokens(req.user.id, 4);

      return successResponse(
        res,
        {
          url: result.url,
          revised_prompt: result.revised_prompt,
          remainingTokens: tokenResult.remainingTokens
        },
        'Görsel başarıyla oluşturuldu'
      );

    } catch (error) {
      logger.error('Text-to-Image error:', error);
      
      if (error.message.includes('API key')) {
        return errorResponse(res, 'OpenAI API yapılandırması eksik. Lütfen yönetici ile iletişime geçin.', 503);
      }

      if (error.message.includes('Yetersiz token')) {
        return errorResponse(res, error.message, 403);
      }

      next(error);
    }
  }

  /**
   * @route   POST /api/ai/image-to-image
   * @desc    Mevcut görseli düzenle
   * @access  Private
   */
  async imageToImage(req, res, next) {
    let uploadedFilePath = null;

    try {
      // Token kontrolü - Tasarım işlemi: 4 token
      const hasTokens = await userService.hasEnoughTokens(req.user.id, 4);
      if (!hasTokens) {
        return errorResponse(res, 'Yetersiz token. Günlük token limitinize ulaştınız.', 403);
      }

      if (!req.file) {
        return errorResponse(res, 'Lütfen bir görsel yükleyin', 400);
      }

      const { prompt, size } = req.body;

      if (!prompt) {
        return errorResponse(res, 'Lütfen bir açıklama girin', 400);
      }

      uploadedFilePath = req.file.path;
      logger.info(`Image-to-Image isteği: ${prompt}`);

      const result = await aiService.imageToImage(uploadedFilePath, prompt, {
        size: size || '1024x1024'
      });

      // Token tüket
      const tokenResult = await userService.consumeTokens(req.user.id, 4);

      // Geçici dosyayı sil
      await aiService.cleanupTempFiles([uploadedFilePath]);

      return successResponse(
        res,
        {
          url: result.url,
          revised_prompt: result.revised_prompt,
          remainingTokens: tokenResult.remainingTokens
        },
        'Görsel başarıyla düzenlendi'
      );

    } catch (error) {
      // Hata durumunda geçici dosyayı sil
      if (uploadedFilePath) {
        await aiService.cleanupTempFiles([uploadedFilePath]);
      }

      logger.error('Image-to-Image error:', error);
      
      if (error.message.includes('API key')) {
        return errorResponse(res, 'OpenAI API yapılandırması eksik. Lütfen yönetici ile iletişime geçin.', 503);
      }

      if (error.message.includes('Yetersiz token')) {
        return errorResponse(res, error.message, 403);
      }

      next(error);
    }
  }

  /**
   * @route   POST /api/ai/generate-etsy-tags
   * @desc    Etsy için SEO-optimized ürün tagleri oluştur
   * @access  Private
   */
  async generateEtsyTags(req, res, next) {
    try {
      // Token kontrolü - Başlık&Tag işlemi: 1 token
      const hasTokens = await userService.hasEnoughTokens(req.user.id, 1);
      if (!hasTokens) {
        return errorResponse(res, 'Yetersiz token. Günlük token limitinize ulaştınız.', 403);
      }

      const { 
        productName, 
        productType, 
        keywords, 
        targetAudience, 
        style,
        color,
        material,
        occasion,
        theme
      } = req.body;

      if (!productName) {
        return errorResponse(res, 'Lütfen ürün adını girin', 400);
      }

      logger.info(`Etsy tag isteği: ${productName}`);

      const result = await aiService.generateEtsyTags({
        productName,
        productType,
        keywords,
        targetAudience,
        style,
        color,
        material,
        occasion,
        theme
      });

      // Token tüket
      const tokenResult = await userService.consumeTokens(req.user.id, 1);

      return successResponse(
        res,
        {
          tags: result.tags,
          count: result.count,
          remainingTokens: tokenResult.remainingTokens
        },
        'Taglar başarıyla oluşturuldu'
      );

    } catch (error) {
      logger.error('Generate Etsy Tags error:', error);
      
      if (error.message.includes('API key')) {
        return errorResponse(res, 'OpenAI API yapılandırması eksik. Lütfen yönetici ile iletişime geçin.', 503);
      }

      if (error.message.includes('Yetersiz token')) {
        return errorResponse(res, error.message, 403);
      }

      next(error);
    }
  }

  /**
   * @route   POST /api/ai/generate-etsy-title
   * @desc    Etsy için SEO-optimized ürün başlığı oluştur
   * @access  Private
   */
  async generateEtsyTitle(req, res, next) {
    try {
      // Token kontrolü - Başlık&Tag işlemi: 1 token
      const hasTokens = await userService.hasEnoughTokens(req.user.id, 1);
      if (!hasTokens) {
        return errorResponse(res, 'Yetersiz token. Günlük token limitinize ulaştınız.', 403);
      }

      const { 
        productName, 
        productType, 
        keywords, 
        targetAudience, 
        style,
        color,
        size,
        occasion
      } = req.body;

      if (!productName) {
        return errorResponse(res, 'Lütfen ürün adını girin', 400);
      }

      logger.info(`Etsy başlık isteği: ${productName}`);

      const result = await aiService.generateEtsyTitle({
        productName,
        productType,
        keywords,
        targetAudience,
        style,
        color,
        size,
        occasion
      });

      // Token tüket
      const tokenResult = await userService.consumeTokens(req.user.id, 1);

      return successResponse(
        res,
        {
          titles: result.titles,
          count: result.count,
          remainingTokens: tokenResult.remainingTokens
        },
        'Başlıklar başarıyla oluşturuldu'
      );

    } catch (error) {
      logger.error('Generate Etsy Title error:', error);
      
      if (error.message.includes('API key')) {
        return errorResponse(res, 'OpenAI API yapılandırması eksik. Lütfen yönetici ile iletişime geçin.', 503);
      }

      if (error.message.includes('Yetersiz token')) {
        return errorResponse(res, error.message, 403);
      }

      next(error);
    }
  }

  /**
   * @route   POST /api/ai/generate-etsy-description
   * @desc    Etsy için SEO-optimized ürün açıklaması oluştur
   * @access  Private
   */
  async generateEtsyDescription(req, res, next) {
    try {
      // Token kontrolü - Açıklama işlemi: 1 token
      const hasTokens = await userService.hasEnoughTokens(req.user.id, 1);
      if (!hasTokens) {
        return errorResponse(res, 'Yetersiz token. Günlük token limitinize ulaştınız.', 403);
      }

      const { 
        productName, 
        productType, 
        keywords, 
        targetAudience, 
        style,
        material,
        features,
        tone
      } = req.body;

      if (!productName) {
        return errorResponse(res, 'Lütfen ürün adını girin', 400);
      }

      logger.info(`Etsy açıklama isteği: ${productName}`);

      const result = await aiService.generateEtsyDescription({
        productName,
        productType,
        keywords,
        targetAudience,
        style,
        material,
        features,
        tone
      });

      // Token tüket
      const tokenResult = await userService.consumeTokens(req.user.id, 1);

      return successResponse(
        res,
        {
          description: result.description,
          characterCount: result.characterCount,
          wordCount: result.wordCount,
          remainingTokens: tokenResult.remainingTokens
        },
        'Açıklama başarıyla oluşturuldu'
      );

    } catch (error) {
      logger.error('Generate Etsy Description error:', error);
      
      if (error.message.includes('API key')) {
        return errorResponse(res, 'OpenAI API yapılandırması eksik. Lütfen yönetici ile iletişime geçin.', 503);
      }

      if (error.message.includes('Yetersiz token')) {
        return errorResponse(res, error.message, 403);
      }

      next(error);
    }
  }

  /**
   * @route   POST /api/ai/generate-mockup
   * @desc    Tasarımı ürün üzerinde mockup olarak oluştur
   * @access  Private
   */
  async generateMockup(req, res, next) {
    let uploadedFilePath = null;

    try {
      // Token kontrolü - Tasarım işlemi: 4 token
      const hasTokens = await userService.hasEnoughTokens(req.user.id, 4);
      if (!hasTokens) {
        return errorResponse(res, 'Yetersiz token. Günlük token limitinize ulaştınız.', 403);
      }

      // Dosya yüklendi mi kontrol et
      if (!req.file) {
        return errorResponse(res, 'Lütfen tasarım dosyası yükleyin', 400);
      }

      const { productType, productColor } = req.body;

      if (!productType) {
        return errorResponse(res, 'Lütfen ürün tipini belirtin', 400);
      }

      if (!productColor) {
        return errorResponse(res, 'Lütfen ürün rengini belirtin', 400);
      }

      uploadedFilePath = req.file.path;
      logger.info(`Mockup oluşturma isteği: ${productType} - ${productColor}`);

      // Mockup oluştur
      const result = await aiService.generateMockup(
        uploadedFilePath,
        productType,
        productColor,
        {
          size: req.body.size || '1024x1024'
        }
      );

      // Token tüket
      const tokenResult = await userService.consumeTokens(req.user.id, 4);

      // Geçici dosyayı sil
      await aiService.cleanupTempFiles([uploadedFilePath]);

      // Mockup'ı base64 olarak döndür
      const base64Image = result.imageBuffer.toString('base64');

      return successResponse(
        res,
        {
          image: `data:image/jpeg;base64,${base64Image}`,
          mockupUrl: result.mockupUrl,
          revisedPrompt: result.revisedPrompt,
          productType: productType,
          productColor: productColor,
          remainingTokens: tokenResult.remainingTokens
        },
        'Mockup başarıyla oluşturuldu'
      );

    } catch (error) {
      // Hata durumunda geçici dosyayı sil
      if (uploadedFilePath) {
        await aiService.cleanupTempFiles([uploadedFilePath]);
      }

      logger.error('Generate Mockup error:', error);
      
      if (error.message.includes('API key')) {
        return errorResponse(res, 'OpenAI API yapılandırması eksik. Lütfen yönetici ile iletişime geçin.', 503);
      }

      if (error.message.includes('Yetersiz token')) {
        return errorResponse(res, error.message, 403);
      }

      next(error);
    }
  }
}

module.exports = new AIController();


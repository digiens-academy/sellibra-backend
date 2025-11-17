const { createQueue, createWorker, queues } = require('../config/queue');
const aiService = require('../services/ai.service');
const userService = require('../services/user.service');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Initialize AI queues (will be null if Redis is not available)
try {
  queues.aiRemoveBackground = createQueue('ai-remove-background');
  queues.aiTextToImage = createQueue('ai-text-to-image');
  queues.aiImageToImage = createQueue('ai-image-to-image');
  queues.aiGenerateContent = createQueue('ai-generate-content');
  
  if (!queues.aiRemoveBackground || !queues.aiTextToImage || !queues.aiImageToImage || !queues.aiGenerateContent) {
    logger.warn('⚠️  Some queues could not be initialized - Redis connection may be unavailable');
    logger.warn('⚠️  AI endpoints will use direct processing (fallback mode)');
  }
} catch (error) {
  logger.error('Failed to initialize AI queues:', error.message);
  logger.warn('⚠️  AI endpoints will use direct processing (fallback mode)');
}

/**
 * Remove Background Worker (only if queue is available)
 */
const removeBackgroundWorker = queues.aiRemoveBackground ? createWorker(
  'ai-remove-background',
  async (job) => {
    const { imagePath, userId, tokenAmount } = job.data;

    try {
      // Process image
      const processedImageBuffer = await aiService.removeBackground(imagePath);

      // Consume tokens (atomic operation)
      const tokenResult = await userService.consumeTokens(userId, tokenAmount);

      // Cleanup temp file
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      return {
        success: true,
        imageBuffer: processedImageBuffer.toString('base64'),
        remainingTokens: tokenResult.remainingTokens,
      };
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      throw error;
    }
  },
  {
    concurrency: 3, // Process 3 remove background jobs concurrently
  }
) : null;

/**
 * Text-to-Image Worker (only if queue is available)
 */
const textToImageWorker = queues.aiTextToImage ? createWorker(
  'ai-text-to-image',
  async (job) => {
    const { prompt, options, userId, tokenAmount } = job.data;

    try {
      // Generate image
      const result = await aiService.textToImage(prompt, options);

      // Consume tokens
      const tokenResult = await userService.consumeTokens(userId, tokenAmount);

      return {
        success: true,
        ...result,
        remainingTokens: tokenResult.remainingTokens,
      };
    } catch (error) {
      throw error;
    }
  },
  {
    concurrency: 2, // Process 2 text-to-image jobs concurrently (more resource intensive)
  }
) : null;

/**
 * Image-to-Image Worker (only if queue is available)
 */
const imageToImageWorker = queues.aiImageToImage ? createWorker(
  'ai-image-to-image',
  async (job) => {
    const { imagePath, prompt, options, userId, tokenAmount } = job.data;

    try {
      // Process image
      const result = await aiService.imageToImage(imagePath, prompt, options);

      // Consume tokens
      const tokenResult = await userService.consumeTokens(userId, tokenAmount);

      // Cleanup temp file
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      return {
        success: true,
        ...result,
        remainingTokens: tokenResult.remainingTokens,
      };
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      throw error;
    }
  },
  {
    concurrency: 2, // Process 2 image-to-image jobs concurrently
  }
) : null;

/**
 * Generate Content Worker (Tags, Title, Description) (only if queue is available)
 */
const generateContentWorker = queues.aiGenerateContent ? createWorker(
  'ai-generate-content',
  async (job) => {
    const { type, productInfo, userId, tokenAmount } = job.data;

    try {
      let result;
      
      switch (type) {
        case 'tags':
          result = await aiService.generateEtsyTags(productInfo);
          break;
        case 'title':
          result = await aiService.generateEtsyTitle(productInfo);
          break;
        case 'description':
          result = await aiService.generateEtsyDescription(productInfo);
          break;
        default:
          throw new Error(`Unknown content type: ${type}`);
      }

      // Consume tokens
      const tokenResult = await userService.consumeTokens(userId, tokenAmount);

      return {
        success: true,
        ...result,
        remainingTokens: tokenResult.remainingTokens,
      };
    } catch (error) {
      throw error;
    }
  },
  {
    concurrency: 5, // Process 5 content generation jobs concurrently (less resource intensive)
  }
) : null;

if (removeBackgroundWorker || textToImageWorker || imageToImageWorker || generateContentWorker) {
  logger.info('✅ AI workers initialized');
} else {
  logger.warn('⚠️  AI workers not initialized - Redis connection required for queue processing');
  logger.warn('⚠️  AI endpoints will use direct processing (fallback mode)');
}

module.exports = {
  removeBackgroundWorker,
  textToImageWorker,
  imageToImageWorker,
  generateContentWorker,
};


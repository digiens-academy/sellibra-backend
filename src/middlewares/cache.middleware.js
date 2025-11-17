const { cache } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Cache middleware for caching API responses
 * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
 * @param {function} keyGenerator - Optional function to generate cache key from request
 */
const cacheMiddleware = (ttlSeconds = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `cache:${req.originalUrl}:${req.user?.id || 'guest'}`;

    try {
      // Try to get from cache
      const cached = await cache.get(cacheKey);

      if (cached !== null) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return res.json(cached);
      }

      // Cache miss - store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = (data) => {
        // Cache the response
        cache.set(cacheKey, data, ttlSeconds).catch((error) => {
          logger.error(`Cache set error for key ${cacheKey}:`, error.message);
        });

        // Send response
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error(`Cache middleware error for key ${cacheKey}:`, error.message);
      // Continue without cache on error
      next();
    }
  };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Cache key pattern to invalidate
 */
const invalidateCache = async (pattern) => {
  try {
    const deleted = await cache.delPattern(pattern);
    logger.info(`Cache invalidated: ${pattern} (${deleted} keys deleted)`);
    return deleted;
  } catch (error) {
    logger.error(`Cache invalidation error for pattern ${pattern}:`, error.message);
    return 0;
  }
};

/**
 * Invalidate user-specific cache
 * @param {number} userId - User ID to invalidate cache for
 */
const invalidateUserCache = async (userId) => {
  const patterns = [
    `cache:*/api/users/profile*:${userId}`,
    `cache:*/api/users/tokens*:${userId}`,
    `cache:*/api/auth/me*:${userId}`,
    `user:${userId}:*`,
  ];

  let totalDeleted = 0;
  for (const pattern of patterns) {
    const deleted = await invalidateCache(pattern);
    totalDeleted += deleted;
  }

  return totalDeleted;
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  invalidateUserCache,
};


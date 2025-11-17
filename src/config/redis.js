const Redis = require('ioredis');
const config = require('./env');
const logger = require('../utils/logger');

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: false,
  connectTimeout: 10000,
  lazyConnect: true,
};

// Create Redis client
const redis = new Redis(redisConfig);

// Redis connection event handlers
redis.on('connect', () => {
  logger.info('✅ Redis client connected');
});

redis.on('ready', () => {
  logger.info('✅ Redis client ready');
});

redis.on('error', (error) => {
  logger.error('❌ Redis client error:', error.message);
  // Don't exit process - app can work without Redis (with degraded performance)
});

redis.on('close', () => {
  logger.warn('⚠️  Redis connection closed');
});

redis.on('reconnecting', (ms) => {
  logger.info(`🔄 Redis reconnecting in ${ms}ms`);
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await redis.connect();
    logger.info('✅ Redis connected successfully');
  } catch (error) {
    logger.error('❌ Redis connection failed:', error.message);
    logger.warn('⚠️  App will continue without Redis cache (degraded performance)');
    // Don't exit - app can work without Redis
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  try {
    await redis.quit();
    logger.info('✅ Redis connection closed gracefully');
  } catch (error) {
    logger.error('❌ Error closing Redis connection:', error);
  }
});

// Helper functions for cache operations
const cache = {
  // Get value from cache
  get: async (key) => {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error.message);
      return null;
    }
  },

  // Set value in cache with TTL
  set: async (key, value, ttlSeconds = 300) => {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error.message);
      return false;
    }
  },

  // Delete value from cache
  del: async (key) => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis del error for key ${key}:`, error.message);
      return false;
    }
  },

  // Delete multiple keys matching pattern
  delPattern: async (pattern) => {
    try {
      const stream = redis.scanStream({
        match: pattern,
        count: 100,
      });

      const keys = [];
      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });

      return new Promise((resolve, reject) => {
        stream.on('end', async () => {
          if (keys.length > 0) {
            await redis.del(...keys);
          }
          resolve(keys.length);
        });
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error(`Redis delPattern error for pattern ${pattern}:`, error.message);
      return 0;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis exists error for key ${key}:`, error.message);
      return false;
    }
  },

  // Get TTL of a key
  ttl: async (key) => {
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error(`Redis ttl error for key ${key}:`, error.message);
      return -1;
    }
  },
};

module.exports = { redis, connectRedis, cache };


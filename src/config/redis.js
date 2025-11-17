const Redis = require('ioredis');
const config = require('./env');
const logger = require('../utils/logger');

// Redis connection configuration
// Support both REDIS_URL and individual REDIS_HOST/REDIS_PORT
// For multi-project setup: Use different database numbers (0-15) or key prefixes
let redisConfig;

if (process.env.REDIS_URL) {
  // Use REDIS_URL if provided (e.g., redis://redis:6379 or redis://localhost:6379)
  // Database can be specified in URL: redis://localhost:6379/1
  const redisUrl = process.env.REDIS_URL;
  
  // If REDIS_DB is specified separately, append it to URL
  if (process.env.REDIS_DB && !redisUrl.includes('/')) {
    redisConfig = `${redisUrl}/${process.env.REDIS_DB}`;
  } else {
    redisConfig = redisUrl;
  }
} else {
  // Use individual settings
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10), // Default: database 0, use 1-15 for other projects
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
}

// Key prefix for this project (to avoid conflicts with other projects)
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'sellibra:';

// Create Redis client
// If REDIS_URL is a string, ioredis will parse it automatically
// If it's an object, use it as config
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

// Helper function to add prefix to keys
const addPrefix = (key) => {
  return key.startsWith(REDIS_KEY_PREFIX) ? key : `${REDIS_KEY_PREFIX}${key}`;
};

// Helper function to remove prefix from keys (for pattern matching)
const addPrefixToPattern = (pattern) => {
  return pattern.startsWith(REDIS_KEY_PREFIX) ? pattern : `${REDIS_KEY_PREFIX}${pattern}`;
};

// Helper functions for cache operations
const cache = {
  // Get value from cache
  get: async (key) => {
    try {
      const prefixedKey = addPrefix(key);
      const value = await redis.get(prefixedKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error.message);
      return null;
    }
  },

  // Set value in cache with TTL
  set: async (key, value, ttlSeconds = 300) => {
    try {
      const prefixedKey = addPrefix(key);
      await redis.setex(prefixedKey, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error.message);
      return false;
    }
  },

  // Delete value from cache
  del: async (key) => {
    try {
      const prefixedKey = addPrefix(key);
      await redis.del(prefixedKey);
      return true;
    } catch (error) {
      logger.error(`Redis del error for key ${key}:`, error.message);
      return false;
    }
  },

  // Delete multiple keys matching pattern
  delPattern: async (pattern) => {
    try {
      const prefixedPattern = addPrefixToPattern(pattern);
      const stream = redis.scanStream({
        match: prefixedPattern,
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
      const prefixedKey = addPrefix(key);
      const result = await redis.exists(prefixedKey);
      return result === 1;
    } catch (error) {
      logger.error(`Redis exists error for key ${key}:`, error.message);
      return false;
    }
  },

  // Get TTL of a key
  ttl: async (key) => {
    try {
      const prefixedKey = addPrefix(key);
      return await redis.ttl(prefixedKey);
    } catch (error) {
      logger.error(`Redis ttl error for key ${key}:`, error.message);
      return -1;
    }
  },
};

module.exports = { redis, connectRedis, cache };


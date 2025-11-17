const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('./env');

let redisClient = null;

const connectRedis = async () => {
  try {
    // Redis URL varsa kullan, yoksa fallback
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        logger.error('Redis reconnection error:', err);
        return true;
      },
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis connection error:', err.message);
      // Redis hata verse bile uygulama çalışmaya devam etsin
    });

    redisClient.on('close', () => {
      logger.warn('⚠️  Redis connection closed');
    });

    // Bağlantıyı test et
    await redisClient.ping();
    logger.info('🏓 Redis ping successful');

    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error.message);
    logger.warn('⚠️  Application will continue without Redis caching');
    // Redis olmadan da çalışabilsin
    return null;
  }
};

const getRedisClient = () => {
  return redisClient;
};

// Redis yoksa fallback fonksiyonlar
const safeGet = async (key) => {
  try {
    if (!redisClient) return null;
    return await redisClient.get(key);
  } catch (error) {
    logger.error('Redis GET error:', error.message);
    return null;
  }
};

const safeSet = async (key, value, ttl = 300) => {
  try {
    if (!redisClient) return false;
    if (ttl) {
      await redisClient.set(key, value, 'EX', ttl);
    } else {
      await redisClient.set(key, value);
    }
    return true;
  } catch (error) {
    logger.error('Redis SET error:', error.message);
    return false;
  }
};

const safeDel = async (key) => {
  try {
    if (!redisClient) return false;
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Redis DEL error:', error.message);
    return false;
  }
};

const safeExists = async (key) => {
  try {
    if (!redisClient) return false;
    const exists = await redisClient.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('Redis EXISTS error:', error.message);
    return false;
  }
};

// Graceful shutdown
const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed gracefully');
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  safeGet,
  safeSet,
  safeDel,
  safeExists,
  disconnectRedis,
};


const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

// Genel API rate limiter
const createRateLimiter = (windowMs, max, message) => {
  const redisClient = getRedisClient();

  // Redis varsa Redis store kullan, yoksa memory store
  const storeConfig = redisClient
    ? {
        store: new RedisStore({
          client: redisClient,
          prefix: 'rl:',
        }),
      }
    : {};

  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Admin kullanıcıları rate limiting'den muaf tut
      return req.user && req.user.role === 'admin';
    },
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message,
      });
    },
    ...storeConfig,
  });
};

// Farklı endpoint'ler için farklı limitler
const limiters = {
  // Genel API limiti: 100 istek / dakika
  general: createRateLimiter(
    60 * 1000,
    100,
    'Çok fazla istek gönderdiniz. Lütfen 1 dakika sonra tekrar deneyin.'
  ),

  // Auth işlemleri: 5 istek / 15 dakika
  auth: createRateLimiter(
    15 * 60 * 1000,
    5,
    'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'
  ),

  // AI işlemleri: 20 istek / dakika (ağır işlemler)
  ai: createRateLimiter(
    60 * 1000,
    20,
    'AI işlemleri için limit aşıldı. Lütfen 1 dakika sonra tekrar deneyin.'
  ),

  // PrintNest tracking: 50 istek / dakika
  printnest: createRateLimiter(
    60 * 1000,
    50,
    'PrintNest tracking limiti aşıldı. Lütfen 1 dakika sonra tekrar deneyin.'
  ),

  // Etsy işlemleri: 30 istek / dakika
  etsy: createRateLimiter(
    60 * 1000,
    30,
    'Etsy işlemleri için limit aşıldı. Lütfen 1 dakika sonra tekrar deneyin.'
  ),
};

module.exports = limiters;


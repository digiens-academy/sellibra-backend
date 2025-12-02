const { prisma } = require('../config/database');
const { verifyToken, formatUser, errorResponse } = require('../utils/helpers');
const { cache } = require('../config/redis');
const subscriptionService = require('../services/subscription.service');
const logger = require('../utils/logger');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return errorResponse(res, 'Lütfen giriş yapınız', 401);
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return errorResponse(res, 'Geçersiz veya süresi dolmuş token', 401);
    }

    // Try to get user from cache first
    const cacheKey = `user:${decoded.id}:profile`;
    let user = await cache.get(cacheKey);

    if (!user) {
      // Cache miss - get from database
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!dbUser) {
        return errorResponse(res, 'Kullanıcı bulunamadı', 401);
      }

      // Format user and cache it
      user = formatUser(dbUser);
      // Cache for 5 minutes
      await cache.set(cacheKey, user, 300);
    } else {
      logger.debug(`Auth cache hit for user ${decoded.id}`);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return errorResponse(res, 'Yetkilendirme hatası', 401);
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return errorResponse(res, 'Bu işlem için admin yetkisi gereklidir', 403);
  }
};

// Admin or Support middleware (Destek rolü ve admin erişebilir)
const adminOrSupport = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'support')) {
    next();
  } else {
    return errorResponse(res, 'Bu işlem için admin veya destek yetkisi gereklidir', 403);
  }
};

// Support only middleware (Sadece destek rolü - salt okunur kullanıcı listesi için)
const supportOnly = (req, res, next) => {
  if (req.user && req.user.role === 'support') {
    next();
  } else {
    return errorResponse(res, 'Bu işlem için destek yetkisi gereklidir', 403);
  }
};

// Premium subscription middleware (Etsy-AI tools için)
const premiumOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Lütfen giriş yapınız', 401);
    }

    // Admin her zaman erişebilir
    if (req.user.role === 'admin') {
      return next();
    }

    // Try to get subscription status from cache first
    const cacheKey = `user:${req.user.id}:subscription`;
    let hasActivePremium = await cache.get(cacheKey);

    if (hasActivePremium === null) {
      // Cache miss - check from service (which also uses cache internally)
      hasActivePremium = await subscriptionService.hasActivePremiumSubscription(req.user.id);
      // Cache for 1 hour (3600 seconds)
      await cache.set(cacheKey, hasActivePremium, 3600);
    } else {
      logger.debug(`Premium cache hit for user ${req.user.id}`);
    }

    if (!hasActivePremium) {
      return errorResponse(
        res,
        'Bu özellik sadece premium aboneliği olan öğrenciler için kullanılabilir',
        403
      );
    }

    next();
  } catch (error) {
    logger.error('Premium middleware error:', error);
    return errorResponse(res, 'Abonelik kontrolü yapılamadı', 500);
  }
};

module.exports = { protect, adminOnly, adminOrSupport, supportOnly, premiumOnly };


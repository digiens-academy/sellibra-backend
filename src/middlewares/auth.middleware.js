const { prisma } = require('../config/database');
const { verifyToken, formatUser, errorResponse } = require('../utils/helpers');
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

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return errorResponse(res, 'Kullanıcı bulunamadı', 401);
    }

    // Attach user to request
    req.user = formatUser(user);
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

    // Premium subscription kontrolü
    const hasActivePremium = await subscriptionService.hasActivePremiumSubscription(req.user.id);

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

module.exports = { protect, adminOnly, premiumOnly };


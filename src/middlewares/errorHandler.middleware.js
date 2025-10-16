const logger = require('../utils/logger');
const config = require('../config/env');

// Global error handler
const errorHandler = (err, req, res, next) => {
  logger.error('Error:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Sunucu hatası';

  // Prisma unique constraint error
  if (err.code === 'P2002') {
    statusCode = 400;
    message = 'Bu bilgilerle kayıtlı bir kullanıcı zaten mevcut';
  }

  // Prisma record not found error
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Kayıt bulunamadı';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Geçersiz token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token süresi dolmuş';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};

// 404 handler
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint bulunamadı',
  });
};

module.exports = { errorHandler, notFound };


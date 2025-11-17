const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const config = require('./config/env');
const { connectDB } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { initializeGoogleSheets } = require('./config/googleSheets');
const { initializeSuperAdmin } = require('./utils/initAdmin');
const { errorHandler, notFound } = require('./middlewares/errorHandler.middleware');
const rateLimiters = require('./middlewares/rateLimiter.middleware');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Connect to Redis (non-blocking)
connectRedis().catch(err => {
  logger.error('Redis connection failed, continuing without cache:', err.message);
});

// Initialize Google Sheets
initializeGoogleSheets();

// Initialize Super Admin (async)
(async () => {
  try {
    await initializeSuperAdmin();
  } catch (error) {
    logger.error('Failed to initialize super admin:', error);
  }
})();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies with limit

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting (genel limit)
app.use('/api/', rateLimiters.general);

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// API Routes with specific rate limiters
app.use('/api/auth', rateLimiters.auth, require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/printnest', rateLimiters.printnest, require('./routes/printnest.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/ai', rateLimiters.ai, require('./routes/ai.routes'));
app.use('/api/etsy-stores', rateLimiters.etsy, require('./routes/etsyStore.routes'));

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${config.nodeEnv} mode on port ${PORT}`);
  logger.info(`📝 Health check: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await disconnectRedis();
  process.exit(0);
});


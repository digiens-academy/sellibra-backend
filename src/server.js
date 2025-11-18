const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeGoogleSheets } = require('./config/googleSheets');
// Initialize circuit breakers
const { initializeCircuitBreakers } = require('./utils/circuitBreaker');
initializeCircuitBreakers();

// Initialize cleanup cron job
const { initializeCleanupJob } = require('./jobs/cleanupTempFiles');
initializeCleanupJob();

// Initialize AI workers (queue processing)
require('./workers/ai.worker');
// Initialize Google Sheets sync worker
require('./workers/sheets.worker');
const { initializeSuperAdmin } = require('./utils/initAdmin');
const { errorHandler, notFound } = require('./middlewares/errorHandler.middleware');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Connect to Redis (non-blocking - app can work without it)
connectRedis();

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

// Trust proxy - required for rate limiting behind reverse proxy (Nginx, etc.)
app.set('trust proxy', 1); // Trust first proxy

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
// Body parser configuration - 10MB limit for file uploads
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Request timeout configuration (30 seconds for AI operations)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({
      success: false,
      message: 'İstek zaman aşımına uğradı',
    });
  });
  next();
});

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate Limiting Configuration
// General API limiter - applies to all API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Çok fazla istek gönderdiniz, lütfen 15 dakika sonra tekrar deneyin.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

// AI endpoints limiter - stricter limits for resource-intensive operations
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 AI requests per 15 minutes
  message: {
    success: false,
    message: 'AI işlemleri için limit aşıldı. Lütfen bir süre bekleyin ve tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints limiter - prevent brute force attacks
// More lenient for development/testing, but still protects against brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 auth requests per 15 minutes (increased from 5 for better UX)
  message: {
    success: false,
    message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests (only failed attempts count)
  // Note: Using memory store by default. For distributed systems, consider adding rate-limit-redis package
});

// Admin endpoints limiter - higher limit for admin operations
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for admin operations
  message: {
    success: false,
    message: 'Admin işlemleri için limit aşıldı.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/ai/', aiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/admin/', adminLimiter);

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

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/printnest', require('./routes/printnest.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/etsy-stores', require('./routes/etsyStore.routes'));
app.use('/api/announcements', require('./routes/announcement.routes'));

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


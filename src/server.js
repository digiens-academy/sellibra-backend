const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { connectDB } = require('./config/database');
const { initializeGoogleSheets } = require('./config/googleSheets');
const { initializeSuperAdmin } = require('./utils/initAdmin');
const { errorHandler, notFound } = require('./middlewares/errorHandler.middleware');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Connect to database
connectDB();

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
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

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


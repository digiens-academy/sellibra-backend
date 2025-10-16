const config = require('../config/env');

const logLevels = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const logger = {
  error: (message, ...args) => {
    console.error(`[${logLevels.ERROR}] ${new Date().toISOString()}:`, message, ...args);
  },

  warn: (message, ...args) => {
    console.warn(`[${logLevels.WARN}] ${new Date().toISOString()}:`, message, ...args);
  },

  info: (message, ...args) => {
    console.log(`[${logLevels.INFO}] ${new Date().toISOString()}:`, message, ...args);
  },

  debug: (message, ...args) => {
    if (config.nodeEnv === 'development') {
      console.log(`[${logLevels.DEBUG}] ${new Date().toISOString()}:`, message, ...args);
    }
  },
};

module.exports = logger;


const CircuitBreaker = require('opossum');
const logger = require('./logger');

// Circuit breaker options
const defaultOptions = {
  timeout: 30000, // 30 seconds timeout
  errorThresholdPercentage: 50, // Open circuit after 50% of requests fail
  resetTimeout: 60000, // Try to close circuit after 60 seconds
  rollingCountTimeout: 120000, // Count errors over 2 minutes
  rollingCountBuckets: 10, // Number of buckets for rolling count
  name: 'default',
  enabled: true,
};

/**
 * Create a circuit breaker for an async function
 * @param {Function} fn - Function to wrap with circuit breaker
 * @param {object} options - Circuit breaker options
 * @returns {CircuitBreaker}
 */
const createCircuitBreaker = (fn, options = {}) => {
  const breakerOptions = {
    ...defaultOptions,
    ...options,
  };

  const breaker = new CircuitBreaker(fn, breakerOptions);

  // Event handlers
  breaker.on('open', () => {
    logger.warn(`Circuit breaker ${breakerOptions.name} opened - too many failures`);
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker ${breakerOptions.name} half-open - testing connection`);
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker ${breakerOptions.name} closed - service recovered`);
  });

  breaker.on('failure', (error) => {
    logger.error(`Circuit breaker ${breakerOptions.name} failure:`, error.message);
  });

  breaker.on('timeout', (error) => {
    logger.error(`Circuit breaker ${breakerOptions.name} timeout:`, error.message);
  });

  return breaker;
};

// Pre-configured circuit breakers for external APIs
const circuitBreakers = {
  // OpenAI API circuit breaker
  openai: null,
  
  // Remove.bg API circuit breaker
  removeBg: null,
  
  // Subscription API circuit breaker
  subscription: null,
  
  // Google Sheets API circuit breaker
  googleSheets: null,
};

/**
 * Initialize circuit breakers for external APIs
 */
const initializeCircuitBreakers = () => {
  // OpenAI API breaker
  circuitBreakers.openai = createCircuitBreaker(
    async (url, data, config) => {
      const axios = require('axios');
      return await axios.post(url, data, config);
    },
    {
      name: 'OpenAI',
      timeout: 60000,
      errorThresholdPercentage: 50,
      resetTimeout: 120000, // 2 minutes
    }
  );

  // Remove.bg API breaker
  circuitBreakers.removeBg = createCircuitBreaker(
    async (url, formData, config) => {
      const axios = require('axios');
      return await axios.post(url, formData, config);
    },
    {
      name: 'Remove.bg',
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 120000,
    }
  );

  // Subscription API breaker
  circuitBreakers.subscription = createCircuitBreaker(
    async (url, config) => {
      const axios = require('axios');
      return await axios.get(url, config);
    },
    {
      name: 'Subscription API',
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000, // 1 minute
    }
  );

  // Google Sheets API breaker
  circuitBreakers.googleSheets = createCircuitBreaker(
    async (fn) => {
      return await fn();
    },
    {
      name: 'Google Sheets',
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 120000,
    }
  );

  logger.info('✅ Circuit breakers initialized');
};

module.exports = {
  createCircuitBreaker,
  circuitBreakers,
  initializeCircuitBreakers,
};


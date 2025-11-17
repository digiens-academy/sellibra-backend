const { Queue, Worker, QueueEvents } = require('bullmq');
const logger = require('../utils/logger');

// Queue connection configuration
// Support REDIS_URL or individual settings
// For multi-project: Use different database numbers (0-15) or same DB with key prefixes
// IMPORTANT: BullMQ needs its own connection config, not the redis client from redis.js
let connection;

if (process.env.REDIS_URL) {
  // Parse REDIS_URL for BullMQ
  // REDIS_URL format: redis://host:port/db or redis://host:port
  const redisUrl = process.env.REDIS_URL;
  
  // If URL already contains database number (redis://redis:6379/0), use it directly
  if (redisUrl.includes('/') && /\d+$/.test(redisUrl.split('/').pop())) {
    connection = redisUrl;
  } else if (process.env.REDIS_DB) {
    // Append database number if not in URL
    connection = `${redisUrl}/${process.env.REDIS_DB}`;
  } else {
    connection = redisUrl;
  }
} else {
  // Use individual settings - Docker container name should be used for host
  connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10), // Use different DB number for each project
    maxRetriesPerRequest: null, // Required for BullMQ
  };
}

// Default job options
const defaultJobOptions = {
  attempts: 3, // Retry 3 times on failure
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 seconds delay
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 1000, // Keep max 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
};

/**
 * Create a new queue
 * @param {string} queueName - Name of the queue
 * @param {object} options - Additional queue options
 * @returns {Queue}
 */
const createQueue = (queueName, options = {}) => {
  try {
    const queue = new Queue(queueName, {
      connection,
      defaultJobOptions: {
        ...defaultJobOptions,
        ...options.defaultJobOptions,
      },
    });

    // Queue event handlers
    queue.on('error', (error) => {
      logger.error(`Queue ${queueName} error:`, error);
    });

    return queue;
  } catch (error) {
    logger.error(`Failed to create queue ${queueName}:`, error.message);
    logger.warn(`Queue ${queueName} will not be available - Redis connection required`);
    return null;
  }
};

/**
 * Create a new worker
 * @param {string} queueName - Name of the queue
 * @param {function} processor - Job processor function
 * @param {object} options - Additional worker options
 * @returns {Worker}
 */
const createWorker = (queueName, processor, options = {}) => {
  try {
    const worker = new Worker(
      queueName,
      async (job) => {
        logger.info(`Processing job ${job.id} in queue ${queueName}`);
        try {
          const result = await processor(job);
          logger.info(`Job ${job.id} completed successfully`);
          return result;
        } catch (error) {
          logger.error(`Job ${job.id} failed:`, error);
          throw error;
        }
      },
      {
        connection,
        concurrency: options.concurrency || 5, // Process 5 jobs concurrently
        ...options,
      }
    );

    // Worker event handlers
    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed in queue ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed in queue ${queueName}:`, err.message);
    });

    worker.on('error', (err) => {
      logger.error(`Worker error in queue ${queueName}:`, err);
    });

    return worker;
  } catch (error) {
    logger.error(`Failed to create worker for queue ${queueName}:`, error.message);
    logger.warn(`Worker for ${queueName} will not be available - Redis connection required`);
    return null;
  }
};

/**
 * Create queue events listener
 * @param {string} queueName - Name of the queue
 * @returns {QueueEvents}
 */
const createQueueEvents = (queueName) => {
  const queueEvents = new QueueEvents(queueName, { connection });

  queueEvents.on('error', (error) => {
    logger.error(`QueueEvents error for ${queueName}:`, error);
  });

  return queueEvents;
};

// Export queues (will be initialized by workers)
const queues = {
  // AI processing queues
  aiRemoveBackground: null,
  aiTextToImage: null,
  aiImageToImage: null,
  aiGenerateContent: null,
  
  // Google Sheets sync queue
  googleSheetsSync: null,
};

module.exports = {
  createQueue,
  createWorker,
  createQueueEvents,
  queues,
  connection,
  defaultJobOptions,
};


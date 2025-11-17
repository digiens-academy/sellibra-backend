const { PrismaClient } = require('@prisma/client');
const config = require('./env');

// Optimize database URL with connection pool parameters
const getOptimizedDatabaseUrl = () => {
  const dbUrl = config.databaseUrl;
  if (!dbUrl) return dbUrl;

  try {
    const url = new URL(dbUrl);
    
  // Connection pool parameters for high concurrency (2000 users)
  // connection_limit: Maximum number of connections in the pool
  // pool_timeout: Time to wait for a connection (in seconds)
  url.searchParams.set('connection_limit', process.env.DB_CONNECTION_LIMIT || '50');
  url.searchParams.set('pool_timeout', process.env.DB_POOL_TIMEOUT || '20');
  
  // Additional PostgreSQL optimizations
  url.searchParams.set('connect_timeout', '10');
  
  return url.toString();
  } catch (error) {
    // If URL parsing fails, try to append parameters directly
    const separator = dbUrl.includes('?') ? '&' : '?';
    return `${dbUrl}${separator}connection_limit=${process.env.DB_CONNECTION_LIMIT || '50'}&pool_timeout=${process.env.DB_POOL_TIMEOUT || '20'}&connect_timeout=10`;
  }
};

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getOptimizedDatabaseUrl(),
    },
  },
});

// Test database connection
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('⚠️  PostgreSQL is required for the application to run');
    console.error('⚠️  Please ensure PostgreSQL is running and DATABASE_URL is correct');
    // In production, exit. In development, you might want to continue for testing
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing without database (development mode) - some features will not work');
    }
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = { prisma, connectDB };


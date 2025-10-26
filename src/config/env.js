require('dotenv').config();

const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',

  // Google Sheets
  googleSheetsCredentialsPath: process.env.GOOGLE_SHEETS_CREDENTIALS_PATH,
  googleSheetsId: process.env.GOOGLE_SHEETS_ID,
  sheetsWebhookSecret: process.env.SHEETS_WEBHOOK_SECRET,

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // PrintNest
  printNestUrl: process.env.PRINTNEST_URL || 'https://printnest.com',
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'GOOGLE_SHEETS_CREDENTIALS_PATH',
  'GOOGLE_SHEETS_ID',
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Warn if webhook secret is missing (optional but recommended)
if (!process.env.SHEETS_WEBHOOK_SECRET) {
  console.warn('⚠️  SHEETS_WEBHOOK_SECRET not set - webhook endpoint will be unprotected');
  console.warn('   Consider adding it to .env for better security');
}

module.exports = config;


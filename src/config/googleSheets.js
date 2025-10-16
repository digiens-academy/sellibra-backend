const { google } = require('googleapis');
const config = require('./env');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

let sheetsClient = null;

const initializeGoogleSheets = async () => {
  try {
    // Check if credentials file exists
    const credentialsPath = path.resolve(config.googleSheetsCredentialsPath);
    
    if (!fs.existsSync(credentialsPath)) {
      logger.warn('Google Sheets credentials file not found:', credentialsPath);
      logger.warn('Google Sheets sync will be disabled');
      return null;
    }

    // Read credentials
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Create sheets client
    sheetsClient = google.sheets({ version: 'v4', auth });

    logger.info('✅ Google Sheets API initialized successfully');
    return sheetsClient;
  } catch (error) {
    logger.error('❌ Failed to initialize Google Sheets API:', error.message);
    logger.warn('Google Sheets sync will be disabled');
    return null;
  }
};

const getSheetsClient = () => {
  return sheetsClient;
};

module.exports = { initializeGoogleSheets, getSheetsClient };


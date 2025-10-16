const jwt = require('jsonwebtoken');
const config = require('../config/env');

const helpers = {
  // Generate JWT token
  generateToken: (userId) => {
    return jwt.sign({ id: userId }, config.jwtSecret, {
      expiresIn: config.jwtExpire,
    });
  },

  // Verify JWT token
  verifyToken: (token) => {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      return null;
    }
  },

  // Format user object (remove password)
  formatUser: (user) => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  // Calculate time difference in seconds
  calculateTimeDifference: (startDate, endDate) => {
    return Math.floor((new Date(endDate) - new Date(startDate)) / 1000);
  },

  // Format date for Google Sheets (Turkish format)
  formatDateForSheets: (date) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  // Success response helper
  successResponse: (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  },

  // Error response helper
  errorResponse: (res, message = 'Error occurred', statusCode = 500, errors = null) => {
    const response = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  },
};

module.exports = helpers;


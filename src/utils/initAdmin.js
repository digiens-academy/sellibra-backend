const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const logger = require('./logger');

/**
 * Initialize default super admin user
 * Email: admin@admin.com
 * Password: password
 */
async function initializeSuperAdmin() {
  try {
    const adminEmail = 'admin@admin.com';
    
    // Check if super admin already exists
    const existingSuperAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingSuperAdmin) {
      logger.info('✓ Super admin user already exists');
      return existingSuperAdmin;
    }

    // Create super admin
    const hashedPassword = await bcrypt.hash('password', 10);
    
    const superAdmin = await prisma.user.create({
      data: {
        firstName: 'Super',
        lastName: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isSuperAdmin: true,
        printNestConfirmed: true,
        dailyTokens: 999999, // Unlimited tokens for super admin
      },
    });

    logger.info('✓ Super admin user created successfully');
    logger.info(`  Email: ${adminEmail}`);
    logger.info('  Password: password');
    logger.info('  ⚠️  PLEASE CHANGE THE DEFAULT PASSWORD AFTER FIRST LOGIN!');

    return superAdmin;
  } catch (error) {
    logger.error('Failed to initialize super admin:', error);
    throw error;
  }
}

module.exports = { initializeSuperAdmin };


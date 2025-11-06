/**
 * Migration Script: Migrate etsy_store_url from users table to etsy_stores table
 * 
 * This script:
 * 1. Finds all users with etsy_store_url that don't have corresponding entries in etsy_stores
 * 2. Creates etsy_stores entries for these users
 * 3. Preserves all existing data
 */

const { prisma } = require('../config/database');
const logger = require('../utils/logger');

async function migrateEtsyStores() {
  try {
    logger.info('🚀 Starting Etsy store migration...');

    // Get all users with etsy_store_url
    const usersWithEtsyUrl = await prisma.user.findMany({
      where: {
        etsyStoreUrl: {
          not: null,
        },
      },
      include: {
        etsyStores: true,
      },
    });

    logger.info(`📊 Found ${usersWithEtsyUrl.length} users with etsy_store_url`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of usersWithEtsyUrl) {
      try {
        // Check if user already has this store in etsy_stores table
        const existingStore = user.etsyStores.find(
          (store) => store.storeUrl === user.etsyStoreUrl
        );

        if (existingStore) {
          logger.info(`⏭️  User ${user.email} already has store in etsy_stores table - skipping`);
          skippedCount++;
          continue;
        }

        // Create entry in etsy_stores table
        await prisma.etsyStore.create({
          data: {
            userId: user.id,
            storeUrl: user.etsyStoreUrl,
            storeName: null, // Will be filled by user later if needed
          },
        });

        logger.info(`✅ Migrated store for user ${user.email}: ${user.etsyStoreUrl}`);
        migratedCount++;
      } catch (error) {
        logger.error(`❌ Error migrating store for user ${user.email}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    logger.info('');
    logger.info('📋 Migration Summary:');
    logger.info(`   ✅ Migrated: ${migratedCount}`);
    logger.info(`   ⏭️  Skipped (already exists): ${skippedCount}`);
    logger.info(`   ❌ Errors: ${errorCount}`);
    logger.info(`   📊 Total processed: ${usersWithEtsyUrl.length}`);
    logger.info('');
    logger.info('✨ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    logger.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateEtsyStores();


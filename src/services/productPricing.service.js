const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

class ProductPricingService {
  /**
   * Default pricing table for common products
   * These will be seeded to database if they don't exist
   */
  getDefaultPricingTable() {
    return [
      {
        productType: 'Bella Canvas 3001',
        size: null,
        baseColor: null,
        baseCost: 5.50,
        printCost: 8.00,
        shippingCost: 3.50,
        isDefault: true,
        notes: 'Unisex Jersey Short Sleeve Tee',
      },
      {
        productType: 'Gildan 18000',
        size: null,
        baseColor: null,
        baseCost: 7.20,
        printCost: 8.00,
        shippingCost: 3.50,
        isDefault: true,
        notes: 'Heavy Blend Crewneck Sweatshirt',
      },
      {
        productType: 'Gildan 64000',
        size: null,
        baseColor: null,
        baseCost: 4.80,
        printCost: 8.00,
        shippingCost: 3.50,
        isDefault: true,
        notes: 'Softstyle T-Shirt',
      },
      {
        productType: 'Comfort Colors 1717',
        size: null,
        baseColor: null,
        baseCost: 9.00,
        printCost: 8.00,
        shippingCost: 3.50,
        isDefault: true,
        notes: 'Garment Dyed Heavyweight Pocket T-Shirt',
      },
      {
        productType: 'Next Level 3600',
        size: null,
        baseColor: null,
        baseCost: 6.20,
        printCost: 8.00,
        shippingCost: 3.50,
        isDefault: true,
        notes: 'Premium Fitted Short Sleeve Crew',
      },
    ];
  }

  /**
   * Seed default pricing to database
   * Only creates if they don't already exist
   */
  async seedDefaultPricing() {
    try {
      const defaults = this.getDefaultPricingTable();
      let seededCount = 0;

      for (const pricing of defaults) {
        const existing = await prisma.productPricing.findFirst({
          where: {
            userId: null,
            productType: pricing.productType,
            size: null,
            baseColor: null,
          },
        });

        if (!existing) {
          await prisma.productPricing.create({
            data: {
              userId: null,
              ...pricing,
            },
          });
          seededCount++;
        }
      }

      if (seededCount > 0) {
        logger.info(`✅ Seeded ${seededCount} default pricing entries`);
      }

      return { seeded: seededCount };
    } catch (error) {
      logger.error('❌ Error seeding default pricing:', error.message);
      throw error;
    }
  }

  /**
   * Get default pricing for all product types
   * @returns {Array} - Default pricing entries
   */
  async getDefaultPricing() {
    try {
      const pricing = await prisma.productPricing.findMany({
        where: {
          userId: null,
          isDefault: true,
        },
        orderBy: { productType: 'asc' },
      });

      return pricing.map((p) => ({
        id: p.id,
        productType: p.productType,
        baseCost: parseFloat(p.baseCost),
        printCost: parseFloat(p.printCost),
        shippingCost: p.shippingCost ? parseFloat(p.shippingCost) : null,
        notes: p.notes,
      }));
    } catch (error) {
      logger.error('❌ Error getting default pricing:', error.message);
      throw error;
    }
  }

  /**
   * Get user-specific pricing overrides
   * @param {number} userId - User ID
   * @returns {Array} - User's custom pricing entries
   */
  async getUserPricingOverrides(userId) {
    try {
      const pricing = await prisma.productPricing.findMany({
        where: {
          userId,
        },
        orderBy: { productType: 'asc' },
      });

      return pricing.map((p) => ({
        id: p.id,
        productType: p.productType,
        size: p.size,
        baseColor: p.baseColor,
        baseCost: parseFloat(p.baseCost),
        printCost: parseFloat(p.printCost),
        shippingCost: p.shippingCost ? parseFloat(p.shippingCost) : null,
        notes: p.notes,
      }));
    } catch (error) {
      logger.error('❌ Error getting user pricing overrides:', error.message);
      throw error;
    }
  }

  /**
   * Get combined pricing (user overrides + defaults)
   * @param {number} userId - User ID
   * @returns {Array} - Combined pricing list
   */
  async getCombinedPricing(userId) {
    try {
      const [userPricing, defaultPricing] = await Promise.all([
        this.getUserPricingOverrides(userId),
        this.getDefaultPricing(),
      ]);

      // Merge: User pricing overrides defaults
      const productMap = new Map();

      // Add defaults first
      defaultPricing.forEach((p) => {
        productMap.set(p.productType, { ...p, isOverridden: false });
      });

      // Override with user's custom pricing
      userPricing.forEach((p) => {
        const key = p.size && p.baseColor 
          ? `${p.productType}-${p.size}-${p.baseColor}`
          : p.productType;
        
        productMap.set(key, { ...p, isOverridden: true });
      });

      return Array.from(productMap.values());
    } catch (error) {
      logger.error('❌ Error getting combined pricing:', error.message);
      throw error;
    }
  }

  /**
   * Save or update user's custom pricing
   * @param {number} userId - User ID
   * @param {Object} pricing - Pricing data
   * @returns {Object} - Saved pricing entry
   */
  async saveUserPricing(userId, pricing) {
    try {
      const {
        productType,
        size = null,
        baseColor = null,
        baseCost,
        printCost,
        shippingCost = null,
        notes = null,
      } = pricing;

      // Validate
      if (!productType || baseCost === undefined || printCost === undefined) {
        throw new Error('Product type, base cost, and print cost are required');
      }

      const pricingData = {
        userId,
        productType,
        size,
        baseColor,
        baseCost: parseFloat(baseCost),
        printCost: parseFloat(printCost),
        shippingCost: shippingCost ? parseFloat(shippingCost) : null,
        isDefault: false,
        notes,
      };

      const saved = await prisma.productPricing.upsert({
        where: {
          userId_productType_size_baseColor: {
            userId,
            productType,
            size: size || null,
            baseColor: baseColor || null,
          },
        },
        create: pricingData,
        update: pricingData,
      });

      logger.info(`✅ Saved pricing for user ${userId}, product: ${productType}`);

      return {
        id: saved.id,
        productType: saved.productType,
        size: saved.size,
        baseColor: saved.baseColor,
        baseCost: parseFloat(saved.baseCost),
        printCost: parseFloat(saved.printCost),
        shippingCost: saved.shippingCost ? parseFloat(saved.shippingCost) : null,
        notes: saved.notes,
      };
    } catch (error) {
      logger.error('❌ Error saving user pricing:', error.message);
      throw error;
    }
  }

  /**
   * Delete user's custom pricing
   * @param {number} userId - User ID
   * @param {number} pricingId - Pricing entry ID
   * @returns {Object} - Success message
   */
  async deleteUserPricing(userId, pricingId) {
    try {
      // Verify ownership
      const pricing = await prisma.productPricing.findFirst({
        where: {
          id: pricingId,
          userId,
        },
      });

      if (!pricing) {
        throw new Error('Pricing entry not found or not owned by user');
      }

      await prisma.productPricing.delete({
        where: { id: pricingId },
      });

      logger.info(`✅ Deleted pricing ${pricingId} for user ${userId}`);

      return { message: 'Pricing deleted successfully' };
    } catch (error) {
      logger.error('❌ Error deleting user pricing:', error.message);
      throw error;
    }
  }

  /**
   * Get pricing for a specific product type
   * @param {number} userId - User ID
   * @param {string} productType - Product type
   * @param {string} size - Size (optional)
   * @param {string} baseColor - Base color (optional)
   * @returns {Object} - Pricing for the product
   */
  async getPricingForProduct(userId, productType, size = null, baseColor = null) {
    try {
      // Try to find user's custom pricing first
      let pricing = await prisma.productPricing.findFirst({
        where: {
          userId,
          productType,
          size: size || null,
          baseColor: baseColor || null,
        },
      });

      // If not found, try default pricing
      if (!pricing) {
        pricing = await prisma.productPricing.findFirst({
          where: {
            userId: null,
            productType,
            isDefault: true,
          },
        });
      }

      if (!pricing) {
        throw new Error('Pricing not found for this product');
      }

      return {
        id: pricing.id,
        productType: pricing.productType,
        size: pricing.size,
        baseColor: pricing.baseColor,
        baseCost: parseFloat(pricing.baseCost),
        printCost: parseFloat(pricing.printCost),
        shippingCost: pricing.shippingCost ? parseFloat(pricing.shippingCost) : null,
        notes: pricing.notes,
        isUserOverride: pricing.userId !== null,
      };
    } catch (error) {
      logger.error('❌ Error getting pricing for product:', error.message);
      throw error;
    }
  }

  /**
   * Calculate total product cost
   * @param {number} baseCost - Base product cost
   * @param {number} printCost - Printing cost
   * @param {number} shippingCost - Shipping cost
   * @param {number} quantity - Quantity
   * @returns {Object} - Cost breakdown
   */
  calculateProductCost(baseCost, printCost, shippingCost = 0, quantity = 1) {
    const unitCost = baseCost + printCost;
    const totalProductCost = unitCost * quantity;
    const totalShippingCost = shippingCost * quantity;
    const totalCost = totalProductCost + totalShippingCost;

    return {
      unitCost: parseFloat(unitCost.toFixed(2)),
      totalProductCost: parseFloat(totalProductCost.toFixed(2)),
      totalShippingCost: parseFloat(totalShippingCost.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      quantity,
    };
  }

  /**
   * Save product cost for a specific listing
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @param {string} listingId - Listing ID
   * @param {Object} costs - Cost data
   * @returns {Object} - Saved cost entry
   */
  async saveProductCostForListing(userId, storeId, listingId, costs) {
    try {
      // Verify store ownership
      const store = await prisma.etsyStore.findFirst({
        where: { id: storeId, userId },
      });

      if (!store) {
        throw new Error('Mağaza bulunamadı veya yetkiniz yok');
      }

      // Get listing details
      const listing = await prisma.etsyListing.findFirst({
        where: { storeId, listingId },
      });

      if (!listing) {
        throw new Error('Ürün bulunamadı');
      }

      const {
        baseCost = 0,
        printCost = 0,
        shippingCost = 0,
        otherCosts = 0,
      } = costs;

      const pricingData = {
        userId,
        productType: listingId, // Store listingId as productType
        size: null,
        baseColor: null,
        baseCost: parseFloat(baseCost),
        printCost: parseFloat(printCost),
        shippingCost: parseFloat(shippingCost),
        isDefault: false,
        notes: `Costs for listing: ${listing.title}`,
      };

      const saved = await prisma.productPricing.upsert({
        where: {
          userId_productType_size_baseColor: {
            userId,
            productType: listingId,
            size: null,
            baseColor: null,
          },
        },
        create: pricingData,
        update: pricingData,
      });

      logger.info(`✅ Saved cost for listing ${listingId} (user ${userId})`);

      return {
        id: saved.id,
        listingId: listingId,
        baseCost: parseFloat(saved.baseCost),
        printCost: parseFloat(saved.printCost),
        shippingCost: parseFloat(saved.shippingCost),
        totalCost:
          parseFloat(saved.baseCost) +
          parseFloat(saved.printCost) +
          parseFloat(saved.shippingCost),
      };
    } catch (error) {
      logger.error('❌ Error saving product cost for listing:', error.message);
      throw error;
    }
  }

  /**
   * Get product cost by listing ID
   * @param {number} userId - User ID
   * @param {string} listingId - Listing ID
   * @returns {Object|null} - Cost data or null
   */
  async getProductCostByListing(userId, listingId) {
    try {
      const pricing = await prisma.productPricing.findFirst({
        where: {
          userId,
          productType: listingId,
        },
      });

      if (!pricing) {
        return null;
      }

      return {
        id: pricing.id,
        listingId: listingId,
        baseCost: parseFloat(pricing.baseCost),
        printCost: parseFloat(pricing.printCost),
        shippingCost: parseFloat(pricing.shippingCost),
        totalCost:
          parseFloat(pricing.baseCost) +
          parseFloat(pricing.printCost) +
          parseFloat(pricing.shippingCost),
        notes: pricing.notes,
      };
    } catch (error) {
      logger.error('❌ Error getting product cost by listing:', error.message);
      throw error;
    }
  }
}

module.exports = new ProductPricingService();

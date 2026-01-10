const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const etsyOAuthService = require('./etsyOAuth.service');
const logger = require('../utils/logger');

class EtsyAnalyticsService {
  /**
   * Sync shop analytics data from Etsy API
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @param {boolean} forceRefresh - Force refresh even if recently synced
   * @returns {Object} - Analytics summary
   */
  async syncShopAnalytics(userId, storeId, forceRefresh = false) {
    try {
      logger.info(`🔄 Starting analytics sync for store ${storeId}, user ${userId}`);

      // Get store info
      const store = await prisma.etsyStore.findFirst({
        where: { id: storeId, userId, isConnected: true },
      });

      if (!store || !store.shopId) {
        throw new Error('Mağaza bulunamadı veya bağlantı aktif değil');
      }

      // Check if we need to sync (skip if synced within last 24 hours, unless forced)
      const existingAnalytics = await prisma.etsyAnalytics.findUnique({
        where: { storeId },
      });

      if (!forceRefresh && existingAnalytics) {
        const hoursSinceLastSync = (Date.now() - existingAnalytics.lastSyncAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSync < 24) {
          logger.info(`⏭️  Skipping sync for store ${storeId} - synced ${hoursSinceLastSync.toFixed(1)}h ago`);
          return this.getAnalyticsSummary(userId, storeId);
        }
      }

      // Get valid access token
      const accessToken = await etsyOAuthService.getValidAccessToken(storeId);

      // Fetch data from Etsy API
      const [receiptsData, listingsData] = await Promise.all([
        etsyOAuthService.getShopReceipts(store.shopId, accessToken, { limit: 100 }),
        etsyOAuthService.getShopListings(store.shopId, accessToken, { limit: 100 }),
      ]);

      // Aggregate sales data
      const salesAggregation = this.aggregateSalesData(receiptsData.results || []);
      
      // Aggregate listings data
      const listingsAggregation = this.aggregateListingsData(listingsData.results || []);

      // Prepare analytics data
      const analyticsData = {
        shopId: store.shopId,
        ...salesAggregation,
        ...listingsAggregation,
        lastSyncAt: new Date(),
        syncStatus: 'success',
        syncErrorMessage: null,
      };

      // Upsert analytics
      await prisma.etsyAnalytics.upsert({
        where: { storeId },
        create: { storeId, ...analyticsData },
        update: analyticsData,
      });

      // Update listings in database
      await this.updateListingsCache(storeId, listingsData.results || []);

      // Create daily sales summary
      await this.createSalesSummary(storeId, store.shopId, receiptsData.results || []);

      logger.info(`✅ Analytics sync completed for store ${storeId}`);

      return this.getAnalyticsSummary(userId, storeId);
    } catch (error) {
      logger.error(`❌ Analytics sync failed for store ${storeId}:`, error.message);

      // Update sync status to failed
      await prisma.etsyAnalytics.upsert({
        where: { storeId },
        create: {
          storeId,
          shopId: '',
          syncStatus: 'failed',
          syncErrorMessage: error.message,
          lastSyncAt: new Date(),
        },
        update: {
          syncStatus: 'failed',
          syncErrorMessage: error.message,
          lastSyncAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Aggregate sales data from receipts
   * @param {Array} receipts - Array of receipt objects from Etsy API
   * @returns {Object} - Aggregated sales metrics
   */
  aggregateSalesData(receipts) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalSales = 0;
    let totalRevenue = 0;
    let todaySales = 0;
    let todayRevenue = 0;
    let weekSales = 0;
    let weekRevenue = 0;
    let monthSales = 0;
    let monthRevenue = 0;

    receipts.forEach((receipt) => {
      const createdAt = new Date(receipt.created_timestamp * 1000);
      const amount = parseFloat(receipt.grandtotal?.amount || 0);

      totalSales++;
      totalRevenue += amount;

      if (createdAt >= todayStart) {
        todaySales++;
        todayRevenue += amount;
      }

      if (createdAt >= weekStart) {
        weekSales++;
        weekRevenue += amount;
      }

      if (createdAt >= monthStart) {
        monthSales++;
        monthRevenue += amount;
      }
    });

    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      totalSales,
      totalRevenue,
      todaySales,
      todayRevenue,
      weekSales,
      weekRevenue,
      monthSales,
      monthRevenue,
      avgOrderValue,
    };
  }

  /**
   * Aggregate listings data
   * @param {Array} listings - Array of listing objects from Etsy API
   * @returns {Object} - Aggregated listings metrics
   */
  aggregateListingsData(listings) {
    let totalViews = 0;
    let totalFavorites = 0;
    let activeListings = 0;

    listings.forEach((listing) => {
      if (listing.state === 'active') {
        activeListings++;
      }
      totalViews += listing.views || 0;
      totalFavorites += listing.num_favorers || 0;
    });

    return {
      totalViews,
      totalFavorites,
      activeListings,
    };
  }

  /**
   * Update listings cache in database
   * @param {number} storeId - Store ID
   * @param {Array} listings - Array of listing objects from Etsy API
   */
  async updateListingsCache(storeId, listings) {
    try {
      for (const listing of listings) {
        const listingData = {
          storeId,
          listingId: listing.listing_id.toString(),
          title: listing.title,
          description: listing.description || null,
          price: parseFloat(listing.price?.amount || 0),
          currencyCode: listing.price?.currency_code || 'USD',
          quantity: listing.quantity || 0,
          state: listing.state || 'unknown',
          url: listing.url || null,
          views: listing.views || 0,
          favorites: listing.num_favorers || 0,
          numFavorers: listing.num_favorers || 0,
          mainImage: listing.images?.[0]?.url_570xN || null,
          listingCreatedAt: listing.created_timestamp ? new Date(listing.created_timestamp * 1000) : null,
          lastFetchedAt: new Date(),
        };

        await prisma.etsyListing.upsert({
          where: {
            storeId_listingId: {
              storeId,
              listingId: listingData.listingId,
            },
          },
          create: listingData,
          update: listingData,
        });
      }

      logger.info(`✅ Updated ${listings.length} listings in cache for store ${storeId}`);
    } catch (error) {
      logger.error(`❌ Error updating listings cache for store ${storeId}:`, error.message);
    }
  }

  /**
   * Create daily sales summary
   * @param {number} storeId - Store ID
   * @param {string} shopId - Shop ID
   * @param {Array} receipts - Array of receipt objects
   */
  async createSalesSummary(storeId, shopId, receipts) {
    try {
      const salesByDate = {};

      receipts.forEach((receipt) => {
        const date = new Date(receipt.created_timestamp * 1000);
        const dateKey = date.toISOString().split('T')[0];

        if (!salesByDate[dateKey]) {
          salesByDate[dateKey] = {
            salesCount: 0,
            revenue: 0,
            products: {},
          };
        }

        const amount = parseFloat(receipt.grandtotal?.amount || 0);
        salesByDate[dateKey].salesCount++;
        salesByDate[dateKey].revenue += amount;

        // Track products
        receipt.transactions?.forEach((transaction) => {
          const listingId = transaction.listing_id.toString();
          if (!salesByDate[dateKey].products[listingId]) {
            salesByDate[dateKey].products[listingId] = {
              listingId,
              title: transaction.title,
              sales: 0,
              revenue: 0,
            };
          }
          salesByDate[dateKey].products[listingId].sales++;
          salesByDate[dateKey].products[listingId].revenue += amount;
        });
      });

      // Insert or update daily summaries
      for (const [dateKey, data] of Object.entries(salesByDate)) {
        const topProducts = Object.values(data.products)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        const avgOrderValue = data.salesCount > 0 ? data.revenue / data.salesCount : 0;

        await prisma.etsySalesSummary.upsert({
          where: {
            storeId_date_periodType: {
              storeId,
              date: new Date(dateKey),
              periodType: 'daily',
            },
          },
          create: {
            storeId,
            shopId,
            date: new Date(dateKey),
            periodType: 'daily',
            salesCount: data.salesCount,
            revenue: data.revenue,
            avgOrderValue,
            topProducts: topProducts,
          },
          update: {
            salesCount: data.salesCount,
            revenue: data.revenue,
            avgOrderValue,
            topProducts: topProducts,
          },
        });
      }

      logger.info(`✅ Created sales summaries for ${Object.keys(salesByDate).length} days`);
    } catch (error) {
      logger.error(`❌ Error creating sales summaries:`, error.message);
    }
  }

  /**
   * Get analytics summary for a store
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @returns {Object} - Analytics summary
   */
  async getAnalyticsSummary(userId, storeId) {
    try {
      // Verify ownership
      const store = await prisma.etsyStore.findFirst({
        where: { id: storeId, userId },
        include: { analytics: true },
      });

      if (!store) {
        throw new Error('Mağaza bulunamadı');
      }

      if (!store.analytics) {
        return {
          message: 'Analytics verisi henüz mevcut değil. Lütfen sync yapın.',
          needsSync: true,
        };
      }

      return {
        ...store.analytics,
        storeName: store.storeName,
        needsSync: false,
      };
    } catch (error) {
      logger.error(`❌ Error getting analytics summary:`, error.message);
      throw error;
    }
  }

  /**
   * Get sales trend data (last 30 days)
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @param {number} days - Number of days (default: 30)
   * @returns {Array} - Daily sales data
   */
  async getSalesTrend(userId, storeId, days = 30) {
    try {
      // Verify ownership
      const store = await prisma.etsyStore.findFirst({
        where: { id: storeId, userId },
      });

      if (!store) {
        throw new Error('Mağaza bulunamadı');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const summaries = await prisma.etsySalesSummary.findMany({
        where: {
          storeId,
          date: { gte: startDate },
          periodType: 'daily',
        },
        orderBy: { date: 'asc' },
      });

      return summaries.map((s) => ({
        date: s.date,
        salesCount: s.salesCount,
        revenue: parseFloat(s.revenue),
        avgOrderValue: s.avgOrderValue ? parseFloat(s.avgOrderValue) : 0,
      }));
    } catch (error) {
      logger.error(`❌ Error getting sales trend:`, error.message);
      throw error;
    }
  }

  /**
   * Get top products by revenue
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @param {number} limit - Number of products to return
   * @returns {Array} - Top products
   */
  async getTopProducts(userId, storeId, limit = 10) {
    try {
      // Verify ownership
      const store = await prisma.etsyStore.findFirst({
        where: { id: storeId, userId },
      });

      if (!store) {
        throw new Error('Mağaza bulunamadı');
      }

      const listings = await prisma.etsyListing.findMany({
        where: { storeId },
        orderBy: { totalRevenue: 'desc' },
        take: limit,
      });

      return listings.map((l) => ({
        listingId: l.listingId,
        title: l.title,
        price: parseFloat(l.price),
        totalSales: l.totalSales,
        totalRevenue: parseFloat(l.totalRevenue),
        views: l.views,
        favorites: l.favorites,
        mainImage: l.mainImage,
        url: l.url,
      }));
    } catch (error) {
      logger.error(`❌ Error getting top products:`, error.message);
      throw error;
    }
  }

  /**
   * Get all listings with performance metrics
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @param {Object} options - Pagination options
   * @returns {Object} - Listings with pagination
   */
  async getListingsPerformance(userId, storeId, options = {}) {
    try {
      const { page = 1, limit = 50, state = 'active' } = options;
      const skip = (page - 1) * limit;

      // Verify ownership
      const store = await prisma.etsyStore.findFirst({
        where: { id: storeId, userId },
      });

      if (!store) {
        throw new Error('Mağaza bulunamadı');
      }

      const where = { storeId };
      if (state) {
        where.state = state;
      }

      const [listings, total] = await Promise.all([
        prisma.etsyListing.findMany({
          where,
          skip,
          take: limit,
          orderBy: { views: 'desc' },
        }),
        prisma.etsyListing.count({ where }),
      ]);

      return {
        listings: listings.map((l) => ({
          listingId: l.listingId,
          title: l.title,
          price: parseFloat(l.price),
          state: l.state,
          views: l.views,
          favorites: l.favorites,
          totalSales: l.totalSales,
          totalRevenue: parseFloat(l.totalRevenue),
          conversionRate: l.views > 0 ? ((l.totalSales / l.views) * 100).toFixed(2) : 0,
          mainImage: l.mainImage,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`❌ Error getting listings performance:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate profit breakdown for a listing
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @param {string} listingId - Listing ID
   * @param {Object} costs - User-provided costs (optional)
   * @returns {Object} - Profit breakdown
   */
  async getProfitBreakdown(userId, storeId, listingId, costs = {}) {
    try {
      // Verify ownership
      const store = await prisma.etsyStore.findFirst({
        where: { id: storeId, userId },
      });

      if (!store) {
        throw new Error('Mağaza bulunamadı');
      }

      const listing = await prisma.etsyListing.findFirst({
        where: { storeId, listingId },
      });

      if (!listing) {
        throw new Error('Ürün bulunamadı');
      }

      const salePrice = parseFloat(listing.price);
      const productCost = costs.productCost || 0;
      const shippingCost = costs.shippingCost || 0;

      // Etsy fees calculation
      const listingFee = 0.20; // $0.20 per listing
      const transactionFee = salePrice * 0.065; // 6.5%
      const paymentProcessingFee = (salePrice * 0.03) + 0.25; // 3% + $0.25
      const totalEtsyFees = listingFee + transactionFee + paymentProcessingFee;

      // Net profit
      const totalCosts = productCost + shippingCost + totalEtsyFees;
      const netProfit = salePrice - totalCosts;
      const profitMargin = ((netProfit / salePrice) * 100).toFixed(2);

      return {
        listing: {
          listingId: listing.listingId,
          title: listing.title,
          price: salePrice,
        },
        costs: {
          product: productCost,
          shipping: shippingCost,
        },
        etsyFees: {
          listing: listingFee,
          transaction: parseFloat(transactionFee.toFixed(2)),
          paymentProcessing: parseFloat(paymentProcessingFee.toFixed(2)),
          total: parseFloat(totalEtsyFees.toFixed(2)),
        },
        totalCosts: parseFloat(totalCosts.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        profitMargin: parseFloat(profitMargin),
      };
    } catch (error) {
      logger.error(`❌ Error calculating profit breakdown:`, error.message);
      throw error;
    }
  }
}

module.exports = new EtsyAnalyticsService();

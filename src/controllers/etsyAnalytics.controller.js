const etsyAnalyticsService = require('../services/etsyAnalytics.service');
const productPricingService = require('../services/productPricing.service');
const logger = require('../utils/logger');

/**
 * Sync analytics for a store
 */
exports.syncAnalytics = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;
    const { forceRefresh } = req.body;

    logger.info(`🔄 Sync analytics requested for store ${storeId} by user ${userId}`);

    const analytics = await etsyAnalyticsService.syncShopAnalytics(
      userId,
      parseInt(storeId),
      forceRefresh || false
    );

    res.json({
      success: true,
      data: analytics,
      message: 'Analytics synced successfully',
    });
  } catch (error) {
    logger.error('Analytics sync error:', error.message);
    next(error);
  }
};

/**
 * Get analytics summary for a store
 */
exports.getAnalyticsSummary = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;

    const summary = await etsyAnalyticsService.getAnalyticsSummary(
      userId,
      parseInt(storeId)
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Get analytics summary error:', error.message);
    next(error);
  }
};

/**
 * Get sales trend data
 */
exports.getSalesTrend = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;
    const { days } = req.query;

    const trend = await etsyAnalyticsService.getSalesTrend(
      userId,
      parseInt(storeId),
      days ? parseInt(days) : 30
    );

    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    logger.error('Get sales trend error:', error.message);
    next(error);
  }
};

/**
 * Get top products
 */
exports.getTopProducts = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;
    const { limit } = req.query;

    const products = await etsyAnalyticsService.getTopProducts(
      userId,
      parseInt(storeId),
      limit ? parseInt(limit) : 10
    );

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    logger.error('Get top products error:', error.message);
    next(error);
  }
};

/**
 * Get listings performance
 */
exports.getListingsPerformance = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;
    const { page, limit, state } = req.query;

    const result = await etsyAnalyticsService.getListingsPerformance(
      userId,
      parseInt(storeId),
      {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        state: state || 'active',
      }
    );

    res.json({
      success: true,
      data: result.listings,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get listings performance error:', error.message);
    next(error);
  }
};

/**
 * Get profit breakdown for a listing
 */
exports.getProfitBreakdown = async (req, res, next) => {
  try {
    const { storeId, listingId } = req.params;
    const userId = req.user.id;
    const { productCost, shippingCost } = req.query;

    const breakdown = await etsyAnalyticsService.getProfitBreakdown(
      userId,
      parseInt(storeId),
      listingId,
      {
        productCost: productCost ? parseFloat(productCost) : 0,
        shippingCost: shippingCost ? parseFloat(shippingCost) : 0,
      }
    );

    res.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    logger.error('Get profit breakdown error:', error.message);
    next(error);
  }
};

/**
 * Get default product pricing
 */
exports.getDefaultPricing = async (req, res, next) => {
  try {
    const pricing = await productPricingService.getDefaultPricing();

    res.json({
      success: true,
      data: pricing,
    });
  } catch (error) {
    logger.error('Get default pricing error:', error.message);
    next(error);
  }
};

/**
 * Get user's custom pricing
 */
exports.getUserPricing = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const pricing = await productPricingService.getCombinedPricing(userId);

    res.json({
      success: true,
      data: pricing,
    });
  } catch (error) {
    logger.error('Get user pricing error:', error.message);
    next(error);
  }
};

/**
 * Save user's custom pricing
 */
exports.saveUserPricing = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const pricingData = req.body;

    const saved = await productPricingService.saveUserPricing(userId, pricingData);

    res.json({
      success: true,
      data: saved,
      message: 'Pricing saved successfully',
    });
  } catch (error) {
    logger.error('Save user pricing error:', error.message);
    next(error);
  }
};

/**
 * Delete user's custom pricing
 */
exports.deleteUserPricing = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pricingId } = req.params;

    const result = await productPricingService.deleteUserPricing(
      userId,
      parseInt(pricingId)
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Delete user pricing error:', error.message);
    next(error);
  }
};

/**
 * Get profit overview
 */
exports.getProfitOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { storeId } = req.params;

    const overview = await etsyAnalyticsService.calculateProfitOverview(
      userId,
      parseInt(storeId)
    );

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    logger.error('Get profit overview error:', error.message);
    next(error);
  }
};

/**
 * Get product profit breakdown
 */
exports.getProductProfitBreakdown = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { storeId } = req.params;

    const products = await etsyAnalyticsService.calculateProductProfitBreakdown(
      userId,
      parseInt(storeId)
    );

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    logger.error('Get product profit breakdown error:', error.message);
    next(error);
  }
};

/**
 * Get profit trend
 */
exports.getProfitTrend = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { storeId } = req.params;
    const { days = 30 } = req.query;

    const trend = await etsyAnalyticsService.calculateProfitTrend(
      userId,
      parseInt(storeId),
      parseInt(days)
    );

    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    logger.error('Get profit trend error:', error.message);
    next(error);
  }
};

/**
 * Save product cost
 */
exports.saveProductCost = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { storeId, listingId } = req.params;
    const costs = req.body;

    const saved = await productPricingService.saveProductCostForListing(
      userId,
      parseInt(storeId),
      listingId,
      costs
    );

    res.json({
      success: true,
      data: saved,
      message: 'Maliyet bilgisi kaydedildi',
    });
  } catch (error) {
    logger.error('Save product cost error:', error.message);
    next(error);
  }
};

/**
 * Get product cost
 */
exports.getProductCost = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;

    const cost = await productPricingService.getProductCostByListing(
      userId,
      listingId
    );

    res.json({
      success: true,
      data: cost,
    });
  } catch (error) {
    logger.error('Get product cost error:', error.message);
    next(error);
  }
};

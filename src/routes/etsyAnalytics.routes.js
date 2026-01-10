const express = require('express');
const router = express.Router();
const etsyAnalyticsController = require('../controllers/etsyAnalytics.controller');
const { protect } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/etsy-analytics/:storeId/sync
 * @desc    Sync analytics data for a store
 * @access  Private
 */
router.post('/:storeId/sync', etsyAnalyticsController.syncAnalytics);

/**
 * @route   GET /api/etsy-analytics/:storeId/summary
 * @desc    Get analytics summary for a store
 * @access  Private
 */
router.get('/:storeId/summary', etsyAnalyticsController.getAnalyticsSummary);

/**
 * @route   GET /api/etsy-analytics/:storeId/sales-trend
 * @desc    Get sales trend data (last N days)
 * @access  Private
 */
router.get('/:storeId/sales-trend', etsyAnalyticsController.getSalesTrend);

/**
 * @route   GET /api/etsy-analytics/:storeId/top-products
 * @desc    Get top products by revenue
 * @access  Private
 */
router.get('/:storeId/top-products', etsyAnalyticsController.getTopProducts);

/**
 * @route   GET /api/etsy-analytics/:storeId/listings
 * @desc    Get listings performance with pagination
 * @access  Private
 */
router.get('/:storeId/listings', etsyAnalyticsController.getListingsPerformance);

/**
 * @route   GET /api/etsy-analytics/:storeId/profit-breakdown/:listingId
 * @desc    Get profit breakdown for a listing
 * @access  Private
 */
router.get('/:storeId/profit-breakdown/:listingId', etsyAnalyticsController.getProfitBreakdown);

/**
 * @route   GET /api/etsy-analytics/pricing/default
 * @desc    Get default product pricing
 * @access  Private
 */
router.get('/pricing/default', etsyAnalyticsController.getDefaultPricing);

/**
 * @route   GET /api/etsy-analytics/pricing/user
 * @desc    Get user's combined pricing (defaults + overrides)
 * @access  Private
 */
router.get('/pricing/user', etsyAnalyticsController.getUserPricing);

/**
 * @route   POST /api/etsy-analytics/pricing/user
 * @desc    Save user's custom pricing
 * @access  Private
 */
router.post('/pricing/user', etsyAnalyticsController.saveUserPricing);

/**
 * @route   DELETE /api/etsy-analytics/pricing/user/:pricingId
 * @desc    Delete user's custom pricing
 * @access  Private
 */
router.delete('/pricing/user/:pricingId', etsyAnalyticsController.deleteUserPricing);

module.exports = router;

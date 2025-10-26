const etsyStoreService = require('../services/etsyStore.service');
const { successResponse, errorResponse } = require('../utils/helpers');

class EtsyStoreController {
  // @route   GET /api/etsy-stores
  // @desc    Get all user's Etsy stores
  // @access  Private
  async getStores(req, res, next) {
    try {
      const stores = await etsyStoreService.getUserStores(req.user.id);

      return successResponse(res, { stores }, 'Mağazalar getirildi');
    } catch (error) {
      next(error);
    }
  }

  // @route   POST /api/etsy-stores
  // @desc    Add new Etsy store
  // @access  Private
  async addStore(req, res, next) {
    try {
      const { storeUrl, storeName } = req.body;

      if (!storeUrl) {
        return errorResponse(res, 'Mağaza URL gerekli', 400);
      }

      const store = await etsyStoreService.addStore(req.user.id, {
        storeUrl,
        storeName,
      });

      return successResponse(res, { store }, 'Mağaza eklendi');
    } catch (error) {
      if (error.message === 'Bu mağaza zaten ekli') {
        return errorResponse(res, error.message, 400);
      }
      next(error);
    }
  }

  // @route   PUT /api/etsy-stores/:id
  // @desc    Update Etsy store
  // @access  Private
  async updateStore(req, res, next) {
    try {
      const storeId = parseInt(req.params.id);
      const { storeUrl, storeName } = req.body;

      const store = await etsyStoreService.updateStore(storeId, req.user.id, {
        storeUrl,
        storeName,
      });

      return successResponse(res, { store }, 'Mağaza güncellendi');
    } catch (error) {
      if (error.message === 'Mağaza bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }

  // @route   DELETE /api/etsy-stores/:id
  // @desc    Delete Etsy store
  // @access  Private
  async deleteStore(req, res, next) {
    try {
      const storeId = parseInt(req.params.id);

      const result = await etsyStoreService.deleteStore(storeId, req.user.id);

      return successResponse(res, result, 'Mağaza silindi');
    } catch (error) {
      if (error.message === 'Mağaza bulunamadı') {
        return errorResponse(res, error.message, 404);
      }
      next(error);
    }
  }
}

module.exports = new EtsyStoreController();


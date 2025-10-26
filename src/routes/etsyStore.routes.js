const express = require('express');
const router = express.Router();
const etsyStoreController = require('../controllers/etsyStore.controller');
const { protect } = require('../middlewares/auth.middleware');

// All routes are protected (user must be authenticated)
router.use(protect);

// CRUD operations for Etsy stores
router.get('/', etsyStoreController.getStores);
router.post('/', etsyStoreController.addStore);
router.put('/:id', etsyStoreController.updateStore);
router.delete('/:id', etsyStoreController.deleteStore);

module.exports = router;


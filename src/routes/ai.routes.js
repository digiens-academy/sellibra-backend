const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { protect, premiumOnly } = require('../middlewares/auth.middleware');
const { upload } = require('../config/upload');

// Tüm AI route'ları korumalı (authentication + premium subscription gerekli)

// Remove Background
router.post('/remove-background', protect, premiumOnly, upload.single('image'), aiController.removeBackground);

// Text-to-Image
router.post('/text-to-image', protect, premiumOnly, aiController.textToImage);

// Image-to-Image
router.post('/image-to-image', protect, premiumOnly, upload.single('image'), aiController.imageToImage);

// Generate Etsy Tags
router.post('/generate-etsy-tags', protect, premiumOnly, aiController.generateEtsyTags);

// Generate Etsy Title
router.post('/generate-etsy-title', protect, premiumOnly, aiController.generateEtsyTitle);

// Generate Etsy Description
router.post('/generate-etsy-description', protect, premiumOnly, aiController.generateEtsyDescription);

// Generate Mockup
router.post('/generate-mockup', protect, premiumOnly, upload.single('design'), aiController.generateMockup);

// Download Image (CORS workaround)
router.get('/download-image', protect, aiController.downloadImage);

module.exports = router;


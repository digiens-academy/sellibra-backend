const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const { protect, adminOrSupport } = require('../middlewares/auth.middleware');

// Public routes (authenticated users)
router.get('/active', protect, announcementController.getActiveAnnouncements);

// Admin and Support routes
router.get('/', protect, adminOrSupport, announcementController.getAllAnnouncements);
router.get('/:id', protect, adminOrSupport, announcementController.getAnnouncementById);
router.post('/', protect, adminOrSupport, announcementController.createAnnouncement);
router.put('/:id', protect, adminOrSupport, announcementController.updateAnnouncement);
router.put('/:id/deactivate', protect, adminOrSupport, announcementController.deactivateAnnouncement);
router.put('/:id/activate', protect, adminOrSupport, announcementController.activateAnnouncement);
router.delete('/:id', protect, adminOrSupport, announcementController.deleteAnnouncement);

module.exports = router;


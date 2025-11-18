const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');

// Public route - Get active announcements
router.get('/active', announcementController.getActiveAnnouncements);

module.exports = router;


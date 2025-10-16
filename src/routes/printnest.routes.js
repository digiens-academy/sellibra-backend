const express = require('express');
const router = express.Router();
const printNestController = require('../controllers/printnest.controller');
const { protect } = require('../middlewares/auth.middleware');
const validators = require('../utils/validators');

// All routes are protected
router.post('/track-open', protect, printNestController.trackOpen);
router.post('/track-close', protect, validators.trackClose, printNestController.trackClose);
router.post('/track-interaction', protect, validators.trackInteraction, printNestController.trackInteraction);
router.get('/my-sessions', protect, printNestController.getMySessions);

module.exports = router;


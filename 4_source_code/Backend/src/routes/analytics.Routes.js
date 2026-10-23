const express = require('express');
const router = express.Router();
const { getCreatorAnalytics } = require('../controllers/analytics.Controller');
const authMiddleware = require('../middlewares/auth.Middleware');
const cacheMiddleware = require('../middlewares/cache.Middleware');

// Get creator analytics (Cached for 10 minutes)
router.get('/', authMiddleware, cacheMiddleware(600), getCreatorAnalytics);

module.exports = router;


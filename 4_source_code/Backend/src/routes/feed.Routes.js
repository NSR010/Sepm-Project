const express = require('express');
const router = express.Router();
const { getPersonalizedFeed } = require('../controllers/feed.Controller');
const authMiddleware = require('../middlewares/auth.Middleware');

// Personalized AI Feed (Optional auth: if logged in, personalizes feed; otherwise shows trending)
// Using a soft auth check: if token provided, sets req.user
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }
  next();
};

router.get('/', optionalAuth, getPersonalizedFeed);

module.exports = router;


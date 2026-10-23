const { User, Content } = require('../models');
const mlServiceClient = require('../services/mlServiceClient');
const { getCache, setCache, buildFeedCacheKey } = require('../services/redis');

// GET AI PERSONALIZED FEED FOR USER
const getPersonalizedFeed = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const cacheKey = userId ? buildFeedCacheKey(userId) : 'feed:public';

    // 1. Check Redis Cache
    const cachedFeed = await getCache(cacheKey);
    if (cachedFeed) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({ success: true, feed: cachedFeed, source: 'cache' });
    }

    // 2. Retrieve user preferences
    let preferences = [];
    if (userId) {
      const user = await User.findByPk(userId);
      if (user && user.preferences) {
        preferences = user.preferences;
      }
    }

    // 3. Query ML Recommendation Engine / Smart fallback
    const feed = await mlServiceClient.getPersonalizedRecommendations(userId, preferences, 30);

    // 4. Save to Redis (Cache for 15 minutes)
    await setCache(cacheKey, feed, 15 * 60);

    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json({ success: true, feed, source: 'ai-recommendation' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPersonalizedFeed
};


const { getCache, setCache } = require('../services/redis');

/**
 * Express caching middleware using Redis
 * @param {number} [ttl] - Time-to-live in seconds (defaults to 1800s / 30m)
 * @param {Function} [keyGenerator] - Optional custom cache key builder: (req) => string
 */
const cacheMiddleware = (ttl = 1800, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator 
      ? keyGenerator(req) 
      : `cache:${req.originalUrl || req.url}`;

    try {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cachedData);
      }

      res.setHeader('X-Cache', 'MISS');

      // Intercept original res.json to populate cache
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, body, ttl).catch((err) => {
            console.error('Error writing to cache:', err);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error:', err);
      next();
    }
  };
};

module.exports = cacheMiddleware;


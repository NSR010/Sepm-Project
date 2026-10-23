const redis = require('../config/redisClient');

// Default TTL: 30 minutes in seconds
const CACHE_TTL = 60 * 30; 

// Save data to cache (added optional ttl parameter for flexibility)
const setCache = async (key, data, ttl = CACHE_TTL) => {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (err) {
    console.error('Cache set error:', err);
  }
};

// Get data from cache
const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Cache get error:', err);
    return null;
  }
};

// Delete a specific cache key
const deleteCache = async (key) => {
  try {
    await redis.del(key);
  } catch (err) {
    console.error('Cache delete error:', err);
  }
};

// Cache Key Builders adapted for Gallery of Wonders
const buildFeedCacheKey = (userId) => {
  return `feed:${userId}`; // Used when fetching the AI Personalized Feed
};

const buildInsightsCacheKey = (creatorId) => {
  return `insights:${creatorId}`; // Used for the Content Insights Dashboard graphs
};

const buildTokenBlacklistKey = (token) => {
  return `blacklist_${token}`; // Used during logout for token security
};

module.exports = { 
  setCache, 
  getCache, 
  deleteCache, 
  buildFeedCacheKey, 
  buildInsightsCacheKey, 
  buildTokenBlacklistKey 
};
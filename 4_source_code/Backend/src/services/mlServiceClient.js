const axios = require('axios');
const { Content, User } = require('../models');
const { Op } = require('sequelize');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.ML_SERVICE_API_KEY || '';

/**
 * AI Recommendation Service Client
 * Connects directly to the FastAPI Hybrid Recommender (ai/main.py)
 */
class MLServiceClient {
  constructor() {
    this.client = axios.create({
      baseURL: ML_SERVICE_URL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_API_KEY && { 'X-Internal-Key': INTERNAL_API_KEY })
      }
    });
  }

  /**
   * Fetches personalized content recommendations for a user from FastAPI Recommender
   * Calls: GET /api/v1/recommendations/{userid}?k={limit}&exclude_seen=true
   * @param {number|null} userId - ID of the user
   * @param {Array<string>} preferences - User preferred categories (fallback)
   * @param {number} limit - Number of items to return
   * @returns {Promise<Array<Object>>}
   */
  async getPersonalizedRecommendations(userId, preferences = [], limit = 20) {
    if (userId) {
      try {
        const response = await this.client.get(`/api/v1/recommendations/${userId}`, {
          params: {
            k: limit,
            exclude_seen: true
          }
        });

        if (response.data && Array.isArray(response.data.items) && response.data.items.length > 0) {
          const recommendedItems = response.data.items; // [{ contentId, score }]
          const contentIds = recommendedItems.map(item => item.contentId);

          // Fetch full Content objects with creator details from PostgreSQL
          const contents = await Content.findAll({
            where: {
              id: { [Op.in]: contentIds }
            },
            include: [
              { model: User, as: 'creator', attributes: ['id', 'username', 'name', 'avatarUrl'] }
            ]
          });

          // Preserve the AI recommendation rank order
          const contentMap = new Map(contents.map(c => [c.id, c]));
          const sortedContents = [];
          for (const item of recommendedItems) {
            const content = contentMap.get(item.contentId);
            if (content) {
              const contentJson = content.toJSON();
              contentJson.aiScore = item.score;
              contentJson.algoType = response.data.algoType;
              sortedContents.push(contentJson);
            }
          }

          if (sortedContents.length > 0) {
            return sortedContents;
          }
        }
      } catch (error) {
        console.warn(`[ML-Service] AI FastAPI microservice call failed (${error.message}). Falling back to database heuristic.`);
      }
    }

    // Heuristic Fallback (Cold start / guest / offline AI service)
    const whereClause = {};
    if (preferences && preferences.length > 0) {
      whereClause.type = { [Op.in]: preferences };
    }

    const items = await Content.findAll({
      where: whereClause,
      limit,
      order: [
        ['likesCount', 'DESC'],
        ['viewsCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'name', 'avatarUrl'] }
      ]
    });

    return items;
  }

  /**
   * Generates or extracts vector embedding for uploaded content
   * Note: In this architecture, embeddings are batch-generated via scripts/generate_vectors.py
   * @param {Object} content - Content record
   * @returns {Promise<Array<number>|null>}
   */
  async generateEmbedding(content) {
    // Vector generation is processed during model training/retraining
    return null;
  }

  /**
   * Triggers a hot reload of the AI model in memory
   * Calls: POST /api/v1/model/reload
   */
  async reloadModel() {
    try {
      const response = await this.client.post('/api/v1/model/reload');
      return response.data;
    } catch (error) {
      console.warn('[ML-Service] Failed to reload AI model:', error.message);
      return null;
    }
  }

  /**
   * Checks health of the AI service
   * Calls: GET /health
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }
}

module.exports = new MLServiceClient();

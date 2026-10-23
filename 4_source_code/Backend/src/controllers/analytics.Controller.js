const { Content, Engagement, sequelize } = require('../models');
const { getCache, setCache, buildInsightsCacheKey } = require('../services/redis');
const { Op } = require('sequelize');

// GET CREATOR ANALYTICS & INSIGHTS
const getCreatorAnalytics = async (req, res, next) => {
  try {
    const creatorId = req.user ? req.user.id : req.query.userId;

    if (!creatorId) {
      return res.status(400).json({ success: false, message: 'User ID is required for analytics' });
    }

    const cacheKey = buildInsightsCacheKey(creatorId);
    const cachedAnalytics = await getCache(cacheKey);

    if (cachedAnalytics) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({ success: true, ...cachedAnalytics });
    }

    // 1. Total Content Count, Views & Likes for this Creator
    const contentStats = await Content.findAll({
      where: { userId: creatorId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalContents'],
        [sequelize.fn('SUM', sequelize.col('viewsCount')), 'totalViews'],
        [sequelize.fn('SUM', sequelize.col('likesCount')), 'totalLikes']
      ],
      raw: true
    });

    const totalContents = parseInt(contentStats[0]?.totalContents || 0, 10);
    const totalViews = parseInt(contentStats[0]?.totalViews || 0, 10);
    const totalLikes = parseInt(contentStats[0]?.totalLikes || 0, 10);

    // 2. Content Type Breakdown
    const typeBreakdown = await Content.findAll({
      where: { userId: creatorId },
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // 3. Monthly Engagement Trends for the last 6 months (matches AnalyticsChart format [{ name: 'Month', views: N }])
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const trendData = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

      const engagementCount = await Engagement.count({
        where: {
          createdAt: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        },
        include: [{
          model: Content,
          as: 'content',
          where: { userId: creatorId },
          attributes: []
        }]
      });

      trendData.push({
        name: monthNames[targetDate.getMonth()],
        views: engagementCount || Math.max(0, Math.round(totalViews / 6))
      });
    }

    const result = {
      totalContents,
      totalViews,
      totalLikes,
      typeBreakdown,
      data: trendData // Formatted directly for Frontend AnalyticsChart component
    };

    // Cache insights for 10 minutes
    await setCache(cacheKey, result, 10 * 60);

    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCreatorAnalytics
};


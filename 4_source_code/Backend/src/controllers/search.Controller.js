const { searchContents } = require('../services/searchIndexer');

// SEARCH CONTENT (Algolia + PostgreSQL)
const searchContent = async (req, res, next) => {
  try {
    const { q, type } = req.query;

    const results = await searchContents(q || '', { type });

    return res.status(200).json({
      success: true,
      query: q || '',
      total: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchContent
};


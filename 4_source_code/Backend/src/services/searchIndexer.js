const { algoliasearch } = require('algoliasearch');
const { Content, User } = require('../models');
const { Op } = require('sequelize');

const APP_ID = process.env.ALGOLIA_APP_ID;
const API_KEY = process.env.ALGOLIA_API_KEY;
const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || 'contents';

let algoliaClient = null;

if (APP_ID && API_KEY) {
  try {
    algoliaClient = algoliasearch(APP_ID, API_KEY);
    console.log(' Algolia search client initialized');
  } catch (err) {
    console.warn(' Algolia initialization failed:', err.message);
  }
}

/**
 * Indexes a content piece in Algolia for instant search
 * @param {Object} content - Content record
 */
const indexContent = async (content) => {
  if (!algoliaClient) return;

  try {
    const record = {
      objectID: content.id.toString(),
      id: content.id,
      title: content.title,
      type: content.type,
      tags: content.tags || [],
      viewsCount: content.viewsCount,
      likesCount: content.likesCount,
      userId: content.userId,
      createdAt: content.createdAt
    };

    await algoliaClient.saveObject({
      indexName: INDEX_NAME,
      body: record
    });
  } catch (error) {
    console.warn('[SearchIndexer] Failed to index content in Algolia:', error.message);
  }
};

/**
 * Removes a content record from Algolia
 * @param {number|string} contentId
 */
const removeContentFromIndex = async (contentId) => {
  if (!algoliaClient) return;

  try {
    await algoliaClient.deleteObject({
      indexName: INDEX_NAME,
      objectID: contentId.toString()
    });
  } catch (error) {
    console.warn('[SearchIndexer] Failed to delete from Algolia:', error.message);
  }
};

/**
 * Searches contents using Algolia with PostgreSQL fallback
 * @param {string} query - Search keyword
 * @param {Object} filters - Optional filters like { type: 'art' }
 * @returns {Promise<Array<Object>>}
 */
const searchContents = async (query, filters = {}) => {
  if (algoliaClient && query) {
    try {
      const searchResult = await algoliaClient.searchSingleIndex({
        indexName: INDEX_NAME,
        searchParams: {
          query,
          hitsPerPage: 20
        }
      });

      if (searchResult && searchResult.hits && searchResult.hits.length > 0) {
        return searchResult.hits;
      }
    } catch (err) {
      console.warn('[SearchIndexer] Algolia search error, using PostgreSQL search:', err.message);
    }
  }

  // Fallback: search in PostgreSQL database
  const where = {};
  if (query) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${query}%` } }
    ];
  }
  if (filters.type) {
    where.type = filters.type;
  }

  return await Content.findAll({
    where,
    limit: 20,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'name', 'avatarUrl'] }
    ],
    order: [['createdAt', 'DESC']]
  });
};

module.exports = {
  indexContent,
  removeContentFromIndex,
  searchContents
};


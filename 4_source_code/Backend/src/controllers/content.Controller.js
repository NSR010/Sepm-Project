const { Content, User, Board, Engagement } = require('../models');
const { uploadFile, deleteFile } = require('../services/storage.Service');
const searchIndexer = require('../services/searchIndexer');
const mlServiceClient = require('../services/mlServiceClient');
const { deleteCache, buildFeedCacheKey, buildInsightsCacheKey } = require('../services/redis');

// CREATE / UPLOAD CONTENT
const createContent = async (req, res, next) => {
  try {
    const { title, type, boardId } = req.body;
    let metadata = req.body.metadata;
    let tags = req.body.tags;

    // Handle parsed metadata/tags if sent as strings from multipart/form-data
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch (e) { metadata = { description: metadata }; }
    }
    if (typeof tags === 'string') {
      try { tags = JSON.parse(tags); } catch (e) { tags = tags.split(',').map(t => t.trim()); }
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Media file is required for upload' });
    }

    // 1. Upload file to Cloud Storage (AWS S3) or local storage
    const { fileUrl, key } = await uploadFile(req.file);

    // 2. Save record in PostgreSQL
    const content = await Content.create({
      userId: req.user.id,
      boardId: boardId ? parseInt(boardId, 10) : null,
      title,
      type,
      fileUrl,
      metadata: metadata || {},
      tags: tags || []
    });

    // 3. Asynchronously generate AI embeddings and index for Search (non-blocking)
    if (mlServiceClient && typeof mlServiceClient.generateEmbedding === 'function') {
      mlServiceClient.generateEmbedding(content)
        .then((embedding) => {
          if (embedding) {
            content.update({ embedding });
          }
        })
        .catch(err => console.warn('Embedding generation notice:', err.message));
    }

    if (searchIndexer && typeof searchIndexer.indexContent === 'function') {
      searchIndexer.indexContent(content)
        .catch(err => console.warn('Search index notice:', err.message));
    }

    // 4. Invalidate related Redis caches
    try {
      await deleteCache(buildFeedCacheKey(req.user.id));
      await deleteCache(buildInsightsCacheKey(req.user.id));
    } catch (cacheErr) {
      console.warn('Cache purge notice:', cacheErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Content uploaded and preserved successfully',
      content
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL CONTENT (Explore / Discover)
const getAllContent = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (type) {
      where.type = type;
    }

    const { count, rows: contents } = await Content.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'name', 'avatarUrl'] }
      ]
    });

    return res.status(200).json({
      success: true,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
      contents
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE CONTENT & RECORD VIEW ENGAGEMENT
const getContentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const content = await Content.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'name', 'avatarUrl'] },
        { model: Board, as: 'board', attributes: ['id', 'title'] }
      ]
    });

    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    // Increment view count directly on the Content model
    await content.increment('viewsCount');

    return res.status(200).json({ success: true, content });
  } catch (error) {
    next(error);
  }
};

// GET CREATOR CONTENTS (Dashboard)
const getCreatorContent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const contents = await Content.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [{ model: Board, as: 'board', attributes: ['id', 'title'] }]
    });

    return res.status(200).json({ success: true, contents });
  } catch (error) {
    next(error);
  }
};

// DELETE CONTENT
const deleteContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const content = await Content.findByPk(id);

    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    if (content.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this work' });
    }

    // Delete file from storage and search index
    await deleteFile(content.fileUrl);
    await searchIndexer.removeContentFromIndex(content.id);

    // Delete record from PostgreSQL
    await content.destroy();

    // Invalidate caches
    await deleteCache(buildFeedCacheKey(req.user.id));
    await deleteCache(buildInsightsCacheKey(req.user.id));

    return res.status(200).json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// TOGGLE LIKE CONTENT (Updates Content likesCount & Engagements for AI recommender)
const toggleLikeContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const content = await Content.findByPk(id);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    // Look for existing engagement record
    let engagement = await Engagement.findOne({
      where: {
        userId,
        contentId: id
      }
    });

    let isLiked = false;

    if (engagement) {
      isLiked = !engagement.like;
      await engagement.update({ like: isLiked });
    } else {
      isLiked = true;
      await Engagement.create({
        userId,
        contentId: id,
        like: true
      });
    }

    // Update Content likes counter
    if (isLiked) {
      await content.increment('likesCount');
    } else if (content.likesCount > 0) {
      await content.decrement('likesCount');
    }

    await content.reload();

    // Invalidate caches so feed & insights re-calculate
    await deleteCache(buildFeedCacheKey(userId));
    if (content.userId) {
      await deleteCache(buildInsightsCacheKey(content.userId));
    }

    return res.status(200).json({
      success: true,
      liked: isLiked,
      likesCount: content.likesCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContent,
  getAllContent,
  getContentById,
  getCreatorContent,
  deleteContent,
  toggleLikeContent
};


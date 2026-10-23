const express = require('express');
const router = express.Router();
const {
  createContent,
  getAllContent,
  getContentById,
  getCreatorContent,
  deleteContent,
  toggleLikeContent
} = require('../controllers/content.Controller');
const authMiddleware = require('../middlewares/auth.Middleware');
const upload = require('../middlewares/upload.Middleware');
const validate = require('../middlewares/validate.Middleware');
const { contentUploadSchema } = require('../services/validators');

// Public route to explore content
router.get('/', getAllContent);

// Creator specific content (must be before /:id)
router.get('/creator/me', authMiddleware, getCreatorContent);

// Get single content details & track view
router.get('/:id', getContentById);

// Upload new content (Multipart file + body validation)
router.post(
  '/',
  authMiddleware,
  upload.single('file'),
  validate(contentUploadSchema),
  createContent
);

// Like/unlike content
router.post('/:id/like', authMiddleware, toggleLikeContent);

// Delete content
router.delete('/:id', authMiddleware, deleteContent);

module.exports = router;


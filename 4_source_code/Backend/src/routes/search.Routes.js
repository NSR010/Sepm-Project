const express = require('express');
const router = express.Router();
const { searchContent } = require('../controllers/search.Controller');

// Search content across title, metadata, tags
router.get('/', searchContent);

module.exports = router;


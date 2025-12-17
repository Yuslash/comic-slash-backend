const express = require('express');
const router = express.Router();
const { getUploadAuth } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

router.get('/auth', protect, getUploadAuth);

module.exports = router;

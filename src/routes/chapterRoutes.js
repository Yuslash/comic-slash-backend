const express = require('express');
const router = express.Router();
const {
    getChapterById,
    updateChapter
} = require('../controllers/chapterController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:id', getChapterById);
router.put('/:id', protect, updateChapter);

module.exports = router;

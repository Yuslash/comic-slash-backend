const express = require('express');
const router = express.Router();
const {
    getSeries,
    createSeries,
    getSeriesById,
    updateSeries
} = require('../controllers/seriesController');
const {
    getChaptersBySeries,
    createChapter
} = require('../controllers/chapterController');
const { protect } = require('../middleware/authMiddleware');

// Series Routes
router.get('/', getSeries);
router.post('/', protect, createSeries);
router.get('/:id', getSeriesById);
router.put('/:id', protect, updateSeries);

// Nested Chapter Routes (e.g. /api/series/:id/chapters)
router.get('/:id/chapters', getChaptersBySeries);
router.post('/:id/chapters', protect, createChapter);

module.exports = router;

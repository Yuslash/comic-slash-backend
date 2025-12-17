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
    createChapter,
    getChapterById,
    updateChapter
} = require('../controllers/chapterController');
const { protect } = require('../middleware/authMiddleware');

// Series Routes
router.get('/', getSeries);
router.post('/', protect, createSeries);
router.get('/:id', getSeriesById);
router.put('/:id', protect, updateSeries);

// Chapter Routes (Nested under /api/series/:id or separate?)
// To keep it clean, let's mix conventions slightly for convenience or use strict REST.
// Implementation:
router.get('/:id/chapters', getChaptersBySeries);
router.post('/:id/chapters', protect, createChapter);

// Access Specific Chapter (Direct ID access)
// Note: In server.js we only mounted /api/series. Use /api/chapters?
// Wait, I didn't mount /api/chapters in server.js yet.
// I will separate them or mixed them? 
// Ideally specific chapter by ID logic should be separate or accessible here.
// Let's create a separate route file for chapters if I mount /api/chapters.
// For now, I will mount /api/chapters in server.js OR 
// Keep it simple: put everything related here? 
// No, getting Chapter by ID is `GET /api/chapters/:id`.
// I will create `src/routes/chapterRoutes.js` and mount it.

module.exports = router;

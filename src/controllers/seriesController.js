const Series = require('../models/Series');
const Chapter = require('../models/Chapter');
const imagekit = require('../config/imagekit');

// @desc    Get all series (with simple filters)
// @route   GET /api/series
// @access  Public (but 'mine' requires Auth)
const getSeries = async (req, res) => {
    const { filter, mine } = req.query; // popular, new, trending, mine
    let query = {};
    let sort = { updatedAt: -1 };

    // Filter by "My Series"
    if (mine === 'true') {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        query.user = req.session.userId;
    } else {
        // Public view: only published series
        query.published = true;
    }

    // Basic logic for "popular" (could be view count based later)
    if (filter === 'trending') {
        // Mock logic for trending
        sort = { createdAt: -1 };
    }

    const series = await Series.find(query).sort(sort).populate('user', 'username');
    res.json(series);
};

// @desc    Create a new series
// @route   POST /api/series
// @access  Private
const createSeries = async (req, res) => {
    const { title, author, description, tags, coverImage } = req.body;

    if (!title || !author) {
        res.status(400).json({ message: 'Title and Author are required' });
        return;
    }

    const series = await Series.create({
        user: req.session.userId, // Link to creator
        title,
        author,
        description,
        tags,
        coverImage,
        published: false
    });

    res.status(201).json(series);
};

// @desc    Get series by ID
// @route   GET /api/series/:id
// @access  Public
const getSeriesById = async (req, res) => {
    const series = await Series.findById(req.params.id).populate('user', 'username');
    if (series) {
        // If not checking "mine", ensure it is published or user is owner
        const isOwner = req.session.userId && series.user._id.toString() === req.session.userId;
        if (!series.published && !isOwner) {
            return res.status(404).json({ message: 'Series not found or unpublished' });
        }
        res.json(series);
    } else {
        res.status(404).json({ message: 'Series not found' });
    }
};

const updateSeries = async (req, res) => {
    const series = await Series.findById(req.params.id);

    if (!series) {
        return res.status(404).json({ message: 'Series not found' });
    }

    // Verify ownership
    if (series.user.toString() !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, coverImage, coverImageId, status, tags, published } = req.body;

    if (title) series.title = title;
    if (description) series.description = description;

    // Handle Image Replacement
    if (coverImage) {
        // If there's an existing imageID and it's different (or just being replaced), delete the old one
        if (series.coverImageId && series.coverImageId !== coverImageId) {
            console.log(`[Series Update] Replacing old image ID: ${series.coverImageId} with new ID: ${coverImageId}`);
            imagekit.deleteFile(series.coverImageId, function (error, result) {
                if (error) console.log("Failed to delete old series cover:", error);
                else console.log("Deleted old series cover:", series.coverImageId);
            });
        } else if (!series.coverImageId && series.coverImage && series.coverImage !== coverImage) {
            // Legacy Fallback: No ID stored (old upload), try to find by URL/Name
            console.log("[Series Update] Legacy cleanup: No ID found, attempting delete by URL.");
            try {
                const urlParts = series.coverImage.split('/');
                const fileName = urlParts.pop(); // get filename
                if (fileName) {
                    imagekit.listFiles({
                        searchQuery: `name="${fileName}"`
                    }, function (error, result) {
                        if (error) console.log("Legacy delete failed:", error);
                        else if (result && result.length > 0) {
                            const fileId = result[0].fileId;
                            imagekit.deleteFile(fileId, function (err, res) { });
                        }
                    });
                }
            } catch (e) {
                console.log("[Series Update] Error parsing legacy URL:", e);
            }
        }
        series.coverImage = coverImage;
        if (coverImageId) series.coverImageId = coverImageId;
    }

    if (status) series.status = status;
    if (tags) series.tags = tags;
    if (typeof published !== 'undefined') series.published = published;

    const updatedSeries = await series.save();
    res.json(updatedSeries);
};

module.exports = {
    getSeries,
    createSeries,
    getSeriesById,
    updateSeries
};

const Series = require('../models/Series');
const Chapter = require('../models/Chapter');
const imagekit = require('../config/imagekit');

// @desc    Get all series (with simple filters)
// @route   GET /api/series
// @access  Public
const getSeries = async (req, res) => {
    const { filter } = req.query; // popular, new, trending
    let query = {};
    let sort = { updatedAt: -1 };

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
        coverImage
    });

    res.status(201).json(series);
};

// @desc    Get series by ID
// @route   GET /api/series/:id
// @access  Public
const getSeriesById = async (req, res) => {
    const series = await Series.findById(req.params.id).populate('user', 'username');
    if (series) {
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

    const { title, description, coverImage, coverImageId, status, tags } = req.body;

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
                        if (!error && result && result.length > 0) {
                            // Found it! Delete the first match (most likely the one)
                            // Ideally check folder path too, but name is practically unique per upload now
                            const fileId = result[0].fileId;
                            console.log(`[Series Update] Found legacy file ${fileName} with ID ${fileId}. Deleting...`);
                            imagekit.deleteFile(fileId, function (err, res) {
                                if (err) console.log("Legacy delete failed:", err);
                                else console.log("Legacy delete success");
                            });
                        } else {
                            console.log("[Series Update] Could not find legacy file to delete:", fileName);
                        }
                    });
                }
            } catch (e) {
                console.log("[Series Update] Error parsing legacy URL:", e);
            }
        } else {
            console.log(`[Series Update] No old image ID to delete or ID unchanged. Existing: ${series.coverImageId}, New: ${coverImageId}`);
        }
        series.coverImage = coverImage;
        if (coverImageId) series.coverImageId = coverImageId;
    }

    if (status) series.status = status;
    if (tags) series.tags = tags;

    const updatedSeries = await series.save();
    res.json(updatedSeries);
};

module.exports = {
    getSeries,
    createSeries,
    getSeriesById,
    updateSeries
};

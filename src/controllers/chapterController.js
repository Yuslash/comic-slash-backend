const Series = require('../models/Series');
const Chapter = require('../models/Chapter');
const imagekit = require('../config/imagekit');

// @desc    Get all chapters for a series
// @route   GET /api/series/:id/chapters
// @access  Public
const getChaptersBySeries = async (req, res) => {
    const chapters = await Chapter.find({ series: req.params.id }).sort({ order: 1 });
    res.json(chapters);
};

// @desc    Create a new chapter
// @route   POST /api/series/:id/chapters
// @access  Private
const createChapter = async (req, res) => {
    const { title, order } = req.body;
    const seriesId = req.params.id;

    const series = await Series.findById(seriesId);
    if (!series) {
        return res.status(404).json({ message: 'Series not found' });
    }

    // Verify ownership
    if (series.user.toString() !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to add chapters to this series' });
    }

    const chapter = await Chapter.create({
        series: seriesId,
        title,
        order: order || 1, // Auto-increment logic?
        data: [] // Empty initially
    });

    // Update series updatedAt
    series.updatedAt = Date.now();
    await series.save();

    res.status(201).json(chapter);
};

// @desc    Get chapter by ID
// @route   GET /api/chapters/:id
// @access  Public
const getChapterById = async (req, res) => {
    const chapter = await Chapter.findById(req.params.id);
    if (chapter) {
        res.json(chapter);
    } else {
        res.status(404).json({ message: 'Chapter not found' });
    }
};

// @desc    Update chapter data (Save comic)
// @route   PUT /api/chapters/:id
// @access  Private
const updateChapter = async (req, res) => {
    const { data, title, coverImage } = req.body;
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
        return res.status(404).json({ message: 'Chapter not found' });
    }

    // Verify ownership via Series
    const series = await Series.findById(chapter.series);
    if (series.user.toString() !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to edit this chapter' });
    }

    if (data) {
        // --- Image Cleanup Logic for Frames ---
        // 1. Collect all image IDs/URLs from the OLD data
        const oldImages = new Map(); // key: id (preferred) or url, val: {id, url}
        const extractImages = (nodes, map) => {
            if (!nodes) return;
            nodes.forEach(scene => {
                const traverse = (node) => {
                    if (node.type === 'frame' && node.image) {
                        if (node.imageId) map.set(node.imageId, { type: 'id', val: node.imageId });
                        else map.set(node.image, { type: 'url', val: node.image });
                    }
                    if (node.type === 'split' && node.children) {
                        node.children.forEach(traverse);
                    }
                };
                if (scene.root) traverse(scene.root);
            });
        };

        if (chapter.data) extractImages(chapter.data, oldImages);

        // 2. Collect all image IDs/URLs from the NEW data
        const newImages = new Set();
        const extractNewImages = (nodes, set) => {
            if (!nodes) return;
            nodes.forEach(scene => {
                const traverse = (node) => {
                    if (node.type === 'frame' && node.image) {
                        if (node.imageId) set.add(node.imageId);
                        else set.add(node.image);
                    }
                    if (node.type === 'split' && node.children) {
                        node.children.forEach(traverse);
                    }
                };
                if (scene.root) traverse(scene.root);
            });
        };
        extractNewImages(data, newImages);

        // 3. Find items in Old but NOT in New
        const imagekit = require('../config/imagekit');

        oldImages.forEach((value, key) => {
            if (!newImages.has(key)) {
                console.log(`[Frame Cleanup] Image removed from comic: ${key}`);

                if (value.type === 'id') {
                    // Modern delete by ID
                    imagekit.deleteFile(value.val, (err, res) => {
                        if (err) console.log("Failed to delete frame image:", err);
                        else console.log("Deleted frame image:", value.val);
                    });
                } else {
                    // Legacy delete by URL
                    try {
                        const urlParts = value.val.split('/');
                        const fileName = urlParts.pop();
                        if (fileName) {
                            imagekit.listFiles({ searchQuery: `name="${fileName}"` }, function (error, result) {
                                if (!error && result && result.length > 0) {
                                    const fileId = result[0].fileId;
                                    console.log(`[Frame Cleanup] Found legacy frame ${fileName} with ID ${fileId}. Deleting...`);
                                    imagekit.deleteFile(fileId, (err, res) => {
                                        if (err) console.log("Legacy frame delete failed:", err);
                                    });
                                }
                            });
                        }
                    } catch (e) { console.log(e); }
                }
            }
        });

        chapter.data = data;
    }
    if (title) chapter.title = title;

    if (coverImage) {
        if (chapter.coverImageId && chapter.coverImageId !== req.body.coverImageId) {
            const imagekit = require('../config/imagekit'); // Lazy require or ensure top level
            imagekit.deleteFile(chapter.coverImageId, function (error, result) {
                if (error) console.log("Failed to delete old chapter cover:", error);
                else console.log("Deleted old chapter cover:", chapter.coverImageId);
            });
        } else if (!chapter.coverImageId && chapter.coverImage && chapter.coverImage !== coverImage) {
            // Legacy Fallback
            const imagekit = require('../config/imagekit'); // Ensure available
            console.log("[Chapter Update] Legacy cleanup: No ID found, attempting delete by URL.");
            try {
                const urlParts = chapter.coverImage.split('/');
                const fileName = urlParts.pop();
                if (fileName) {
                    imagekit.listFiles({
                        searchQuery: `name="${fileName}"`
                    }, function (error, result) {
                        if (!error && result && result.length > 0) {
                            const fileId = result[0].fileId;
                            console.log(`[Chapter Update] Found legacy file ${fileName} with ID ${fileId}. Deleting...`);
                            imagekit.deleteFile(fileId, function (err, res) {
                                if (err) console.log("Legacy delete failed:", err);
                                else console.log("Legacy delete success");
                            });
                        }
                    });
                }
            } catch (e) { console.log(e); }
        }
        chapter.coverImage = coverImage;
        if (req.body.coverImageId) chapter.coverImageId = req.body.coverImageId;
    }

    const updatedChapter = await chapter.save();
    res.json(updatedChapter);
};

module.exports = {
    getChaptersBySeries,
    createChapter,
    getChapterById,
    updateChapter
};

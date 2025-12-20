const Series = require('../models/Series');
const Chapter = require('../models/Chapter');
const imagekit = require('../config/imagekit');

// @desc    Get all chapters for a series
// @route   GET /api/series/:id/chapters
// @access  Public
const getChaptersBySeries = async (req, res) => {
    const { mine } = req.query;
    let query = { series: req.params.id };

    if (mine !== 'true') {
        // Public view: only published chapters
        query.published = true;
    } else {
        // Verify auth for 'mine' view
        if (!req.session.userId) {
            const series = await Series.findById(req.params.id);
            if (!series || series.user.toString() !== req.session.userId) {
                query.published = true;
            }
        }
    }

    const chapters = await Chapter.find(query).sort({ order: 1 });
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

    if (series.user.toString() !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to add chapters to this series' });
    }

    const chapter = await Chapter.create({
        series: seriesId,
        title,
        order: order || 1,
        data: [],
        published: false
    });

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
        const responseData = chapter.toObject();



        if (!chapter.published) {
            const series = await Series.findById(chapter.series);
            const isOwner = req.session.userId && series && series.user.toString() === req.session.userId;
            if (!isOwner) {
                return res.status(404).json({ message: 'Chapter not found or unpublished' });
            }
        }
        res.json(responseData);
    } else {
        res.status(404).json({ message: 'Chapter not found' });
    }
};

// @desc    Update chapter data
// @route   PUT /api/chapters/:id
// @access  Private
const updateChapter = async (req, res) => {
    const { data, title, coverImage, published, password } = req.body;
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
        return res.status(404).json({ message: 'Chapter not found' });
    }

    const series = await Series.findById(chapter.series);
    if (series.user.toString() !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to edit this chapter' });
    }

    if (data) {
        // --- Image Cleanup Logic ---
        const oldImages = new Map();
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

        oldImages.forEach((value, key) => {
            if (!newImages.has(key)) {
                if (value.type === 'id') {
                    imagekit.deleteFile(value.val, (err, res) => { });
                } else {
                    try {
                        const urlParts = value.val.split('/');
                        const fileName = urlParts.pop();
                        if (fileName) {
                            imagekit.listFiles({ searchQuery: `name="${fileName}"` }, function (error, result) {
                                if (!error && result && result.length > 0) {
                                    imagekit.deleteFile(result[0].fileId, (err, res) => { });
                                }
                            });
                        }
                    } catch (e) { }
                }
            }
        });
        chapter.data = data;
    }

    if (title) chapter.title = title;

    if (coverImage) {
        if (chapter.coverImageId && chapter.coverImageId !== req.body.coverImageId) {
            imagekit.deleteFile(chapter.coverImageId, function (error, result) { });
        }
        chapter.coverImage = coverImage;
        if (req.body.coverImageId) chapter.coverImageId = req.body.coverImageId;
    }

    // Update using findByIdAndUpdate to cleanly handle mixed atomic updates
    const updatePayload = {};
    if (data) updatePayload.data = data;
    if (title) updatePayload.title = title;
    if (coverImage) {
        updatePayload.coverImage = coverImage;
        if (req.body.coverImageId) updatePayload.coverImageId = req.body.coverImageId;
    }
    if (typeof published !== 'undefined') {
        if (published === true && !series.published) {
            return res.status(400).json({ message: 'Cannot publish chapter because Series is unpublished' });
        }
        updatePayload.published = published;
    }
    if (typeof password !== 'undefined') updatePayload.password = password;

    const updatedChapter = await Chapter.findByIdAndUpdate(
        req.params.id,
        { $set: updatePayload },
        { new: true }
    );

    res.json(updatedChapter);
};

module.exports = {
    getChaptersBySeries,
    createChapter,
    getChapterById,
    updateChapter
};

const mongoose = require('mongoose');

const seriesSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    coverImage: {
        type: String,
        default: 'https://placehold.co/400x600/222/fff?text=No+Cover'
    },
    tags: [String],
    status: {
        type: String,
        enum: ['ongoing', 'completed', 'hiatus'],
        default: 'ongoing'
    },
    published: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            return ret;
        }
    }
});

module.exports = mongoose.model('Series', seriesSchema);

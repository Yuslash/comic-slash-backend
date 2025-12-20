const mongoose = require('mongoose');

const chapterSchema = mongoose.Schema({
    series: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Series'
    },
    title: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        required: true,
        default: 1
    },
    coverImage: {
        type: String
    },
    coverImageId: {
        type: String
    },
    // The main comic JSON data
    data: {
        type: Array, // Array of Scenes
        default: []
    },
    published: {
        type: Boolean,
        default: false
    },
    password: {
        type: String
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

module.exports = mongoose.model('Chapter', chapterSchema);

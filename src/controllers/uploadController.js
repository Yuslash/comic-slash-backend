const ImageKit = require('imagekit');
const dotenv = require('dotenv');
dotenv.config();

const imagekit = new ImageKit({
    publicKey: process.env.public_key,
    privateKey: process.env.private_key,
    urlEndpoint: process.env.URL_endpoint
});

// @desc    Get ImageKit Authentication Parameters
// @route   GET /api/upload/auth
// @access  Private (users can upload)
const getUploadAuth = async (req, res) => {
    try {
        const result = imagekit.getAuthenticationParameters();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Auth generation failed' });
    }
};

module.exports = { getUploadAuth };

const User = require('../models/User');

// @desc    Auth user & get session
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        // Create session
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.isAdmin = user.isAdmin;

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = async (req, res) => {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    const user = await User.create({
        username,
        email,
        password
    });

    if (user) {
        // Auto login
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.isAdmin = user.isAdmin;

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Logout user / clear session
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.clearCookie('connect.sid'); // Default cookie name
        res.json({ message: 'Logged out successfully' });
    });
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.session.userId).select('-password');
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Create Guest User
// @route   POST /api/auth/guest
// @access  Public
const guestLogin = async (req, res) => {
    try {
        const randomId = Math.floor(10000 + Math.random() * 90000);
        const username = `Guest Agent ${randomId}`;
        const email = `guest_${randomId}_${Date.now()}@temp.com`;
        const password = Math.random().toString(36).slice(-8);

        const user = await User.create({
            username,
            email,
            password
        });

        if (user) {
            req.session.userId = user._id;
            req.session.username = user.username;
            req.session.isAdmin = false;

            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: false,
                isGuest: true
            });
        } else {
            res.status(400).json({ message: 'Failed to initialize guest session' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error during guest login' });
    }
};

module.exports = {
    loginUser,
    registerUser,
    logoutUser,
    getUserProfile,
    guestLogin
};

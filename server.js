const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./src/config/db');

const app = express();

// Middleware
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic CORS for production and local
const allowedOrigins = ['http://localhost:3000', 'https://comic-slash.vercel.app'];
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

// Database Connection
connectDB(); // Ensure this handles Mongoose caching internally

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_change_this',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // True in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Cross-site cookie for different domains
    }
}));

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/series', require('./src/routes/seriesRoutes'));
app.use('/api/chapters', require('./src/routes/chapterRoutes'));
app.use('/api/upload', require('./src/routes/uploadRoutes'));

// Base Route
app.get('/', (req, res) => {
    res.send('Comic Studio API is running...');
});

const PORT = process.env.PORT || 5000;

// Export for Vercel
module.exports = app;

// Only listen if running locally
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

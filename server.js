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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: 'https://comic-slash.vercel.app', // Frontend URL
    credentials: true // Allow cookies
}));

// Database Connection
connectDB();

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_change_this',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        // secure: process.env.NODE_ENV === 'production' // Set true in prod
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

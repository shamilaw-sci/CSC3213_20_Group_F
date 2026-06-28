require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import Routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courseRoutes');
const lessonRoutes = require('./routes/lessonRoutes'); // New change

const app = express();

// --- MIDDLEWARE ---
app.use(express.json()); // Parses incoming JSON requests
app.use(cors());         // Enables Cross-Origin Resource Sharing

// --- ROOT HEALTH CHECK ---
app.get('/', (req, res) => {
    res.send("LuminaLearn API is running! 🚀");
});

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes); // New change

// --- DATABASE CONNECTION ---
const dbURI = process.env.MONGO_URI;

if (!dbURI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
    process.exit(1);
}

mongoose.connect(dbURI)
    .then(() => console.log("MongoDB Connected! 🚀"))
    .catch((err) => {
        console.error("Database connection error:", err);
        process.exit(1); 
    });

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is up and running on port ${PORT}`);
});
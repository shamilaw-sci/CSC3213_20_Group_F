const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import Routes 
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courseRoutes');
const lessonRoutes = require('./routes/lessonRoutes'); // New change
const scheduleRoutes = require('./routes/scheduleRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();


// --- MIDDLEWARE ---
app.use(express.json({ limit: '10mb' })); // Parses incoming JSON requests
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());         // Enables Cross-Origin Resource Sharing
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded images

// --- ROOT HEALTH CHECK ---
app.get('/', (req, res) => {
    res.send("LuminaLearn API is running! 🚀");
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes); // New change
app.use('/api/schedule', scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err.stack);
    res.status(err.status || 500).json({
        error: err.message || "An internal server error occurred."
    });
});

// --- DATABASE CONNECTION ---
const fallbackDbURI = 'mongodb://developer:dev1234@ac-zqvmyqq-shard-00-00.br5bcum.mongodb.net:27017,ac-zqvmyqq-shard-00-01.br5bcum.mongodb.net:27017,ac-zqvmyqq-shard-00-02.br5bcum.mongodb.net:27017/?ssl=true&replicaSet=atlas-l6y6kk-shard-0&authSource=admin&appName=LuminaLearnCluster';
const dbURI = process.env.MONGO_URI || fallbackDbURI;

if (!dbURI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
    process.exit(1);
}

const startServer = async () => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server is up and running on port ${PORT}`);
    });

    try {
        await mongoose.connect(dbURI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            tls: true,
            retryWrites: true
        });
        console.log("MongoDB Connected! 🚀");

        // Run data migration (Base64 images to disk & Enrollments collection)
        try {
            const { migrateData } = require('./utils/migration');
            await migrateData();
        } catch (migrationErr) {
            console.error("Failed to run startup migration:", migrationErr);
        }
    } catch (err) {
        console.error("Database connection error:", err.message);
        console.error("Atlas connection details:", {
            uri: dbURI.replace(/:([^@]+)@/, ':******@'),
            name: err.name,
            reason: err.reason?.message || err.message,
            code: err.code
        });
        console.warn("MongoDB Atlas connection failed. Please allow this IP in Atlas Network Access or use a different network.");
    }
};

startServer();
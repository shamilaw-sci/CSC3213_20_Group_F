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
const progressRoutes = require('./routes/progressRoutes');
const quizRoutes = require('./routes/quizRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const settingRoutes = require('./routes/settingRoutes');
const searchRoutes = require('./routes/searchRoutes');
const fileRoutes = require('./routes/fileRoutes');
const fileStorage = require('./services/fileStorage');

const app = express();

// Initialize physical storage folders
fileStorage.initStorage();

// --- CORS CONFIGURATION ---
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://luminalearn.edu.lk',
    'https://www.luminalearn.edu.lk',
    'http://localhost:5173',
    'http://localhost:3000'
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Origin ${origin} not allowed by CORS policy.`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// --- MIDDLEWARE ---
app.use(express.json({ limit: '50mb' })); // Parses incoming JSON requests
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors(corsOptions)); // Enables Cross-Origin Resource Sharing
app.use('/media', cors(corsOptions), express.static(path.join(__dirname, 'storage/public'))); // Public media (courses/profiles)
app.use('/uploads', cors(corsOptions), express.static(path.join(__dirname, 'uploads'))); // Legacy uploads compatibility

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
app.use('/api/schedules', scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/files', fileRoutes);


// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err.stack);
    res.status(err.status || 500).json({
        error: err.message || "An internal server error occurred."
    });
});

// --- DATABASE CONNECTION ---
const dbURI = process.env.MONGO_URI;

if (!dbURI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in environment variables. Please provide a valid MongoDB connection string.");
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

        // Ensure users collection email index is sparse to allow multiple email-less accounts
        try {
            const User = require('./models/User');
            const indexes = await User.collection.indexes();
            const emailIndex = indexes.find(idx => idx.name === 'email_1');
            if (emailIndex && !emailIndex.sparse) {
                console.log("🔄 Dropping outdated non-sparse email_1 index...");
                await User.collection.dropIndex('email_1');
                console.log("✨ Creating sparse unique index for email_1...");
                await User.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
                console.log("✅ email_1 sparse index successfully synced!");
            }
        } catch (indexSyncErr) {
            console.warn("Index check note:", indexSyncErr.message);
        }

        // Run data migration only if explicitly requested via environment variable
        if (process.env.RUN_STARTUP_MIGRATION === 'true') {
            try {
                const { migrateData } = require('./utils/migration');
                console.log("🔄 RUN_STARTUP_MIGRATION is enabled. Running migration...");
                await migrateData();
            } catch (migrationErr) {
                console.error("Failed to run startup migration:", migrationErr);
            }
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
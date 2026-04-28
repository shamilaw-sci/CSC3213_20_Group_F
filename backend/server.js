require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courseRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Fixed this!

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);

// Database Connection
// Use a fallback to ensure we know if URI is missing
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI)
  .then(() => console.log("MongoDB Connected! 🚀"))
  .catch((err) => {
      console.error("Database connection error:", err);
      process.exit(1); // Stop the server if DB fails to connect
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
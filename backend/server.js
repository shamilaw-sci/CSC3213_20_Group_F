const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected! 🚀"))
  .catch((err) => console.log("Uh oh, database error:", err));

// Start the server
const PORT = process.env.PORT || 5000;
app.use('/api/auth', require('./routes/auth'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));